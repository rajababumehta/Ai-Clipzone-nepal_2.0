import crypto from 'crypto';
import type { Response } from 'express';

export type RoomParticipantRole = 'mentor' | 'student';

export interface RoomTokenPayload {
  classId: string;
  userId: string;
  displayName: string;
  role: RoomParticipantRole;
  exp: number;
}

export interface RoomPeerPublic {
  peerId: string;
  userId: string;
  displayName: string;
  role: RoomParticipantRole;
  camOn: boolean;
  micOn: boolean;
  screenSharing: boolean;
  handRaised: boolean;
  joinedAt: number;
}

interface InternalPeer extends RoomPeerPublic {
  sseRes: Response;
  lastPing: number;
}

export interface RoomChatMessage {
  id: string;
  senderPeerId: string;
  senderName: string;
  role: RoomParticipantRole;
  text: string;
  timestamp: number;
}

interface LiveRoomState {
  classId: string;
  peers: Map<string, InternalPeer>;
  chat: RoomChatMessage[];
  ended: boolean;
}

const BOOT_SECRET = crypto.randomBytes(32).toString('hex');

function getRoomSecret(): string {
  return process.env.ROOM_TOKEN_SECRET?.trim() || BOOT_SECRET;
}

export function mintRoomToken(payload: RoomTokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', getRoomSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyRoomToken(token: string, expectedClassId: string): RoomTokenPayload | null {
  const raw = String(token || '').trim();
  const dotIdx = raw.indexOf('.');
  if (dotIdx <= 0) return null;

  const body = raw.slice(0, dotIdx);
  const sig = raw.slice(dotIdx + 1);
  if (!body || !sig) return null;

  const expectedSig = crypto.createHmac('sha256', getRoomSecret()).update(body).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as RoomTokenPayload;
    if (!parsed || parsed.classId !== expectedClassId || !parsed.userId || !parsed.role) {
      return null;
    }
    if (typeof parsed.exp !== 'number' || Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

const rooms = new Map<string, LiveRoomState>();

function getOrCreateRoom(classId: string): LiveRoomState {
  let room = rooms.get(classId);
  if (!room) {
    room = {
      classId,
      peers: new Map(),
      chat: [],
      ended: false,
    };
    rooms.set(classId, room);
  }
  return room;
}

function toPublicPeer(p: InternalPeer): RoomPeerPublic {
  return {
    peerId: p.peerId,
    userId: p.userId,
    displayName: p.displayName,
    role: p.role,
    camOn: p.camOn,
    micOn: p.micOn,
    screenSharing: p.screenSharing,
    handRaised: p.handRaised,
    joinedAt: p.joinedAt,
  };
}

function writeSse(res: Response, event: string, data: unknown): void {
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch {
    // Socket closed; cleanup happens on close event
  }
}

function broadcastRoom(room: LiveRoomState, event: string, data: unknown, excludePeerId?: string): void {
  for (const peer of room.peers.values()) {
    if (excludePeerId && peer.peerId === excludePeerId) continue;
    writeSse(peer.sseRes, event, data);
  }
}

export function subscribeRoomSse(params: {
  tokenData: RoomTokenPayload;
  peerId: string;
  camOn?: boolean;
  micOn?: boolean;
  res: Response;
}): void {
  const { tokenData, peerId, camOn = false, micOn = false, res } = params;
  const room = getOrCreateRoom(tokenData.classId);

  // Reopen room cleanly if a mentor reconnects to host again
  if (tokenData.role === 'mentor' && room.ended) {
    room.ended = false;
  }

  // Replace existing connection with the same peerId if reconnecting
  const prev = room.peers.get(peerId);
  if (prev) {
    try {
      prev.sseRes.end();
    } catch {
      // ignore
    }
    room.peers.delete(peerId);
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const peer: InternalPeer = {
    peerId,
    userId: tokenData.userId,
    displayName: tokenData.displayName,
    role: tokenData.role,
    camOn: Boolean(camOn),
    micOn: Boolean(micOn),
    screenSharing: false,
    handRaised: false,
    joinedAt: Date.now(),
    lastPing: Date.now(),
    sseRes: res,
  };

  room.peers.set(peerId, peer);

  // Send current room snapshot to newly connected peer
  writeSse(res, 'room_state', {
    selfPeerId: peerId,
    ended: room.ended,
    peers: Array.from(room.peers.values()).map(toPublicPeer),
    chat: room.chat.slice(-100),
  });

  // Notify existing peers
  broadcastRoom(room, 'peer_joined', { peer: toPublicPeer(peer) }, peerId);

  const heartbeat = setInterval(() => {
    try {
      peer.lastPing = Date.now();
      res.write(`: ping ${peer.lastPing}\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 15_000);

  res.on('close', () => {
    clearInterval(heartbeat);
    const current = room.peers.get(peerId);
    if (current && current.sseRes === res) {
      room.peers.delete(peerId);
      broadcastRoom(room, 'peer_left', { peerId });
      if (room.peers.size === 0 && room.chat.length === 0) {
        rooms.delete(tokenData.classId);
      }
    }
  });
}

export function relayRoomSignal(params: {
  classId: string;
  fromPeerId: string;
  toPeerId: string;
  signal: Record<string, any>;
}): boolean {
  const room = rooms.get(params.classId);
  if (!room) return false;
  const sender = room.peers.get(params.fromPeerId);
  const target = room.peers.get(params.toPeerId);
  if (!sender || !target) return false;

  writeSse(target.sseRes, 'signal', {
    fromPeerId: params.fromPeerId,
    fromRole: sender.role,
    fromName: sender.displayName,
    signal: params.signal,
  });
  return true;
}

export function updatePeerMediaState(params: {
  classId: string;
  peerId: string;
  camOn?: boolean;
  micOn?: boolean;
  screenSharing?: boolean;
  handRaised?: boolean;
}): RoomPeerPublic | null {
  const room = rooms.get(params.classId);
  if (!room) return null;
  const peer = room.peers.get(params.peerId);
  if (!peer) return null;

  if (typeof params.camOn === 'boolean') peer.camOn = params.camOn;
  if (typeof params.micOn === 'boolean') peer.micOn = params.micOn;
  if (typeof params.screenSharing === 'boolean') peer.screenSharing = params.screenSharing;
  if (typeof params.handRaised === 'boolean') peer.handRaised = params.handRaised;

  const pub = toPublicPeer(peer);
  broadcastRoom(room, 'media_state', { peer: pub });
  return pub;
}

export function postRoomChatMessage(params: {
  tokenData: RoomTokenPayload;
  peerId: string;
  text: string;
}): RoomChatMessage {
  const room = getOrCreateRoom(params.tokenData.classId);
  const peer = room.peers.get(params.peerId);
  const msg: RoomChatMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    senderPeerId: params.peerId,
    senderName: peer?.displayName || params.tokenData.displayName,
    role: params.tokenData.role,
    text: params.text.trim().slice(0, 1000),
    timestamp: Date.now(),
  };
  room.chat.push(msg);
  if (room.chat.length > 100) {
    room.chat = room.chat.slice(-100);
  }
  broadcastRoom(room, 'chat_message', { message: msg });
  return msg;
}

export function leaveRoomPeer(classId: string, peerId: string): void {
  const room = rooms.get(classId);
  if (!room) return;
  const peer = room.peers.get(peerId);
  if (!peer) return;
  room.peers.delete(peerId);
  try {
    peer.sseRes.end();
  } catch {
    // ignore
  }
  broadcastRoom(room, 'peer_left', { peerId });
}

export function endLiveRoom(classId: string, endedByName: string): void {
  const room = getOrCreateRoom(classId);
  room.ended = true;
  broadcastRoom(room, 'room_ended', {
    endedBy: endedByName,
    endedAt: Date.now(),
  });
}

export function getRoomSnapshot(classId: string) {
  const room = rooms.get(classId);
  if (!room) return { peers: [], chat: [], ended: false };
  return {
    peers: Array.from(room.peers.values()).map(toPublicPeer),
    chat: room.chat.slice(-100),
    ended: room.ended,
  };
}

export function resetRoomHubForTests(): void {
  for (const room of rooms.values()) {
    for (const peer of room.peers.values()) {
      try {
        peer.sseRes.end();
      } catch {
        // ignore
      }
    }
  }
  rooms.clear();
}
