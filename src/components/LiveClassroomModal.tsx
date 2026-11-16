import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  MonitorUp,
  MonitorOff,
  Hand,
  MessageSquare,
  Users,
  PhoneOff,
  Send,
  ShieldCheck,
  Radio,
  X,
  Power,
} from 'lucide-react';
import { LiveClassJoinResponse } from '../types';
import {
  endLiveRoomSession,
  leaveLiveRoom,
  sendRoomChat,
  sendRoomSignal,
  updateRoomMedia,
} from '../utils/liveClassApi';

interface RoomPeer {
  peerId: string;
  userId: string;
  displayName: string;
  role: 'mentor' | 'student';
  camOn: boolean;
  micOn: boolean;
  screenSharing: boolean;
  handRaised: boolean;
  joinedAt: number;
}

interface RoomChatMsg {
  id: string;
  senderPeerId: string;
  senderName: string;
  role: 'mentor' | 'student';
  text: string;
  timestamp: number;
}

interface LiveClassroomModalProps {
  session: LiveClassJoinResponse;
  onClose: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const VideoTileStream: React.FC<{
  stream: MediaStream | null;
  muted?: boolean;
  mirrored?: boolean;
  className?: string;
}> = ({ stream, muted = false, mirrored = false, className = '' }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }
    if (stream) {
      el.play().catch(() => {});
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={`${mirrored ? '-scale-x-100' : ''} ${className}`}
    />
  );
};

export const LiveClassroomModal: React.FC<LiveClassroomModalProps> = ({
  session,
  onClose,
  showToast,
}) => {
  const classId = session.liveClassId;
  const roomToken = session.roomToken || '';
  const selfRole = session.participantRole || 'student';
  const selfName = session.participantName || (selfRole === 'mentor' ? 'Mentor' : 'Student');
  const selfPeerId = useMemo(
    () => `${selfRole}_${Math.random().toString(36).slice(2, 10)}`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [classId]
  );

  const [connected, setConnected] = useState(false);
  const [roomEndedBy, setRoomEndedBy] = useState<string | null>(null);
  const [peers, setPeers] = useState<RoomPeer[]>([]);
  const [chatMessages, setChatMessages] = useState<RoomChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [unreadChat, setUnreadChat] = useState(0);

  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const makingOfferRef = useRef<Map<string, boolean>>(new Map());
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const showChatRef = useRef(showChat);

  useEffect(() => {
    showChatRef.current = showChat;
    if (showChat) setUnreadChat(0);
  }, [showChat]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  const stopAllLocalMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setLocalStream(null);
  }, []);

  const closePeerConnection = useCallback((remotePeerId: string) => {
    const pc = pcsRef.current.get(remotePeerId);
    if (pc) {
      try {
        pc.close();
      } catch {
        // ignore
      }
      pcsRef.current.delete(remotePeerId);
    }
    pendingIceRef.current.delete(remotePeerId);
    makingOfferRef.current.delete(remotePeerId);
    setRemoteStreams((prev) => {
      if (!prev[remotePeerId]) return prev;
      const next = { ...prev };
      delete next[remotePeerId];
      return next;
    });
  }, []);

  const syncLocalTracksToPc = useCallback((pc: RTCPeerConnection) => {
    const activeVideoTrack =
      screenStreamRef.current?.getVideoTracks()[0] ||
      localStreamRef.current?.getVideoTracks()[0] ||
      null;
    const activeAudioTrack = localStreamRef.current?.getAudioTracks()[0] || null;

    const senders = pc.getSenders();
    const videoSender = senders.find((s) => s.track?.kind === 'video');
    const audioSender = senders.find((s) => s.track?.kind === 'audio');

    if (activeVideoTrack) {
      if (videoSender) {
        videoSender.replaceTrack(activeVideoTrack).catch(() => {});
      } else {
        const stream = screenStreamRef.current || localStreamRef.current!;
        pc.addTrack(activeVideoTrack, stream);
      }
    } else if (videoSender) {
      videoSender.replaceTrack(null).catch(() => {});
    }

    if (activeAudioTrack && localStreamRef.current) {
      if (audioSender) {
        audioSender.replaceTrack(activeAudioTrack).catch(() => {});
      } else {
        pc.addTrack(activeAudioTrack, localStreamRef.current);
      }
    } else if (audioSender) {
      audioSender.replaceTrack(null).catch(() => {});
    }
  }, []);

  const sendOfferToPeer = useCallback(
    async (remotePeerId: string, pc: RTCPeerConnection) => {
      if (!roomToken) return;
      try {
        makingOfferRef.current.set(remotePeerId, true);
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
        await sendRoomSignal(classId, {
          roomToken,
          peerId: selfPeerId,
          toPeerId: remotePeerId,
          signal: { type: 'sdp', description: pc.localDescription },
        });
      } catch {
        // ignore transient negotiation errors
      } finally {
        makingOfferRef.current.set(remotePeerId, false);
      }
    },
    [classId, roomToken, selfPeerId]
  );

  const ensurePeerConnection = useCallback(
    (remotePeerId: string, shouldOfferImmediately = false) => {
      if (remotePeerId === selfPeerId) return null;
      const existing = pcsRef.current.get(remotePeerId);
      if (existing) {
        if (shouldOfferImmediately) {
          void sendOfferToPeer(remotePeerId, existing);
        }
        return existing;
      }

      if (typeof RTCPeerConnection === 'undefined') return null;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcsRef.current.set(remotePeerId, pc);

      // Ensure receive-only capability even before user turns on cam/mic
      try {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
        pc.addTransceiver('video', { direction: 'sendrecv' });
      } catch {
        // fallback handled dynamically
      }

      syncLocalTracksToPc(pc);

      pc.onicecandidate = (event) => {
        if (event.candidate && roomToken) {
          void sendRoomSignal(classId, {
            roomToken,
            peerId: selfPeerId,
            toPeerId: remotePeerId,
            signal: { type: 'ice', candidate: event.candidate.toJSON() },
          }).catch(() => {});
        }
      };

      pc.ontrack = (event) => {
        const stream = event.streams?.[0] || new MediaStream([event.track]);
        setRemoteStreams((prev) => ({ ...prev, [remotePeerId]: stream }));
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          // keep chat alive even if media peer drops
        }
      };

      if (shouldOfferImmediately) {
        void sendOfferToPeer(remotePeerId, pc);
      }

      return pc;
    },
    [classId, roomToken, selfPeerId, sendOfferToPeer, syncLocalTracksToPc]
  );

  const renegotiateAllPeers = useCallback(() => {
    for (const [remotePeerId, pc] of pcsRef.current.entries()) {
      syncLocalTracksToPc(pc);
      void sendOfferToPeer(remotePeerId, pc);
    }
  }, [sendOfferToPeer, syncLocalTracksToPc]);

  // Connect to Express SSE Room Events (Zero extra login!)
  useEffect(() => {
    if (!roomToken) {
      showToast('Live room token missing. Please click Join again.', 'error');
      return;
    }

    const url = `/api/live-classes/${encodeURIComponent(classId)}/room/events?roomToken=${encodeURIComponent(
      roomToken
    )}&peerId=${encodeURIComponent(selfPeerId)}&camOn=0&micOn=0`;
    const es = new EventSource(url);

    es.onopen = () => {
      setConnected(true);
    };

    es.addEventListener('room_state', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        setConnected(true);
        if (data.ended) {
          setRoomEndedBy('Mentor');
        }
        const initialPeers: RoomPeer[] = Array.isArray(data.peers) ? data.peers : [];
        setPeers(initialPeers);
        setChatMessages(Array.isArray(data.chat) ? data.chat : []);
        initialPeers.forEach((p) => {
          if (p.peerId !== selfPeerId) {
            const iInitiate = selfPeerId < p.peerId;
            ensurePeerConnection(p.peerId, iInitiate);
          }
        });
      } catch {
        // ignore malformed state
      }
    });

    es.addEventListener('peer_joined', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        const peer: RoomPeer | undefined = data.peer;
        if (!peer || peer.peerId === selfPeerId) return;
        setPeers((prev) => {
          const filtered = prev.filter((p) => p.peerId !== peer.peerId);
          return [...filtered, peer];
        });
        const iInitiate = selfPeerId < peer.peerId;
        ensurePeerConnection(peer.peerId, iInitiate);
      } catch {
        // ignore
      }
    });

    es.addEventListener('peer_left', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        if (!data.peerId) return;
        setPeers((prev) => prev.filter((p) => p.peerId !== data.peerId));
        closePeerConnection(data.peerId);
      } catch {
        // ignore
      }
    });

    es.addEventListener('media_state', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        const updated: RoomPeer | undefined = data.peer;
        if (!updated) return;
        setPeers((prev) => prev.map((p) => (p.peerId === updated.peerId ? updated : p)));
      } catch {
        // ignore
      }
    });

    es.addEventListener('chat_message', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        const msg: RoomChatMsg | undefined = data.message;
        if (!msg) return;
        setChatMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        if (!showChatRef.current && msg.senderPeerId !== selfPeerId) {
          setUnreadChat((c) => c + 1);
        }
      } catch {
        // ignore
      }
    });

    es.addEventListener('room_ended', (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        setRoomEndedBy(data.endedBy || 'Mentor');
      } catch {
        setRoomEndedBy('Mentor');
      }
    });

    es.addEventListener('signal', async (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data);
        const fromPeerId: string = data.fromPeerId;
        const signal = data.signal;
        if (!fromPeerId || !signal || fromPeerId === selfPeerId) return;

        const pc = ensurePeerConnection(fromPeerId, false);
        if (!pc) return;

        if (signal.type === 'sdp' && signal.description) {
          const desc = signal.description as RTCSessionDescriptionInit;
          const isPolite = selfPeerId > fromPeerId;
          const offerCollision =
            desc.type === 'offer' &&
            (makingOfferRef.current.get(fromPeerId) || pc.signalingState !== 'stable');
          if (offerCollision && !isPolite) {
            return;
          }

          await pc.setRemoteDescription(new RTCSessionDescription(desc));
          const queued = pendingIceRef.current.get(fromPeerId) || [];
          pendingIceRef.current.delete(fromPeerId);
          for (const cand of queued) {
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
          }

          if (desc.type === 'offer') {
            syncLocalTracksToPc(pc);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendRoomSignal(classId, {
              roomToken,
              peerId: selfPeerId,
              toPeerId: fromPeerId,
              signal: { type: 'sdp', description: pc.localDescription },
            });
          }
        } else if (signal.type === 'ice' && signal.candidate) {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
          } else {
            const list = pendingIceRef.current.get(fromPeerId) || [];
            list.push(signal.candidate);
            pendingIceRef.current.set(fromPeerId, list);
          }
        }
      } catch {
        // ignore transient signal error
      }
    });

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
      for (const peerId of Array.from(pcsRef.current.keys())) {
        closePeerConnection(peerId);
      }
      stopAllLocalMedia();
      if (roomToken) {
        void leaveLiveRoom(classId, { roomToken, peerId: selfPeerId }).catch(() => {});
      }
    };
  }, [
    classId,
    closePeerConnection,
    ensurePeerConnection,
    roomToken,
    selfPeerId,
    showToast,
    stopAllLocalMedia,
    syncLocalTracksToPc,
  ]);

  const toggleMic = async () => {
    try {
      if (!micOn) {
        if (!navigator.mediaDevices?.getUserMedia) {
          showToast('Microphone is not supported on this browser.', 'error');
          return;
        }
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioTrack = audioStream.getAudioTracks()[0];
        if (!localStreamRef.current) {
          localStreamRef.current = new MediaStream();
        }
        localStreamRef.current.getAudioTracks().forEach((t) => {
          localStreamRef.current?.removeTrack(t);
          t.stop();
        });
        if (audioTrack) localStreamRef.current.addTrack(audioTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        setMicOn(true);
        renegotiateAllPeers();
        void updateRoomMedia(classId, { roomToken, peerId: selfPeerId, micOn: true }).catch(() => {});
      } else {
        localStreamRef.current?.getAudioTracks().forEach((t) => {
          localStreamRef.current?.removeTrack(t);
          t.stop();
        });
        setLocalStream(
          localStreamRef.current && localStreamRef.current.getTracks().length > 0
            ? new MediaStream(localStreamRef.current.getTracks())
            : null
        );
        setMicOn(false);
        renegotiateAllPeers();
        void updateRoomMedia(classId, { roomToken, peerId: selfPeerId, micOn: false }).catch(() => {});
      }
    } catch {
      showToast('Microphone access denied or unavailable.', 'error');
    }
  };

  const toggleCam = async () => {
    try {
      if (!camOn) {
        if (!navigator.mediaDevices?.getUserMedia) {
          showToast('Camera is not supported on this browser.', 'error');
          return;
        }
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        const videoTrack = videoStream.getVideoTracks()[0];
        if (!localStreamRef.current) {
          localStreamRef.current = new MediaStream();
        }
        localStreamRef.current.getVideoTracks().forEach((t) => {
          localStreamRef.current?.removeTrack(t);
          t.stop();
        });
        if (videoTrack) localStreamRef.current.addTrack(videoTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        setCamOn(true);
        renegotiateAllPeers();
        void updateRoomMedia(classId, { roomToken, peerId: selfPeerId, camOn: true }).catch(() => {});
      } else {
        localStreamRef.current?.getVideoTracks().forEach((t) => {
          localStreamRef.current?.removeTrack(t);
          t.stop();
        });
        setLocalStream(
          localStreamRef.current && localStreamRef.current.getTracks().length > 0
            ? new MediaStream(localStreamRef.current.getTracks())
            : null
        );
        setCamOn(false);
        renegotiateAllPeers();
        void updateRoomMedia(classId, { roomToken, peerId: selfPeerId, camOn: false }).catch(() => {});
      }
    } catch {
      showToast('Camera unavailable or permission denied. You can still stay in audio/chat.', 'info');
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!screenSharing) {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          showToast('Screen sharing is not supported on this device/browser.', 'error');
          return;
        }
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        screenStreamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        if (track) {
          track.onended = () => {
            screenStreamRef.current = null;
            setScreenSharing(false);
            renegotiateAllPeers();
            void updateRoomMedia(classId, { roomToken, peerId: selfPeerId, screenSharing: false }).catch(() => {});
          };
        }
        setScreenSharing(true);
        renegotiateAllPeers();
        void updateRoomMedia(classId, { roomToken, peerId: selfPeerId, screenSharing: true }).catch(() => {});
      } else {
        screenStreamRef.current?.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
        setScreenSharing(false);
        renegotiateAllPeers();
        void updateRoomMedia(classId, { roomToken, peerId: selfPeerId, screenSharing: false }).catch(() => {});
      }
    } catch {
      // User cancelled share picker
    }
  };

  const toggleHandRaise = () => {
    const next = !handRaised;
    setHandRaised(next);
    void updateRoomMedia(classId, { roomToken, peerId: selfPeerId, handRaised: next }).catch(() => {});
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text || !roomToken) return;
    setChatInput('');
    try {
      await sendRoomChat(classId, { roomToken, peerId: selfPeerId, text });
    } catch {
      showToast('Could not send chat message.', 'error');
    }
  };

  const handleLeave = () => {
    stopAllLocalMedia();
    onClose();
  };

  const handleEndClassForAll = async () => {
    if (!roomToken) return;
    try {
      await endLiveRoomSession(classId, { roomToken });
      stopAllLocalMedia();
      showToast('Live class ended for all participants.', 'info');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Could not end live room.', 'error');
    }
  };

  // Spotlight peer priority: someone screen-sharing -> Mentor -> Self (if mentor) -> any active video peer
  const spotlightPeer = useMemo(() => {
    const screenPeer = peers.find((p) => p.screenSharing);
    if (screenPeer) return screenPeer;
    const mentorPeer = peers.find((p) => p.role === 'mentor');
    if (mentorPeer) return mentorPeer;
    return peers[0] || null;
  }, [peers]);

  const spotlightStream = useMemo(() => {
    if (!spotlightPeer) return null;
    if (spotlightPeer.peerId === selfPeerId) {
      return screenSharing ? screenStreamRef.current : localStream;
    }
    return remoteStreams[spotlightPeer.peerId] || null;
  }, [spotlightPeer, selfPeerId, screenSharing, localStream, remoteStreams]);

  const otherPeers = useMemo(
    () => peers.filter((p) => p.peerId !== spotlightPeer?.peerId),
    [peers, spotlightPeer]
  );

  return (
    <div className="fixed inset-0 z-[6500] bg-zinc-950 text-white flex flex-col">
      {/* Top Classroom Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-zinc-900/95 border-b border-zinc-800">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider shrink-0">
            <Radio className="w-3 h-3 animate-pulse" />
            LIVE
          </span>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black truncate">{session.title}</h2>
            <p className="text-[11px] text-zinc-400 truncate">
              {session.courseTitle} • Mentor: {session.instructorName || 'AI Clipzone Mentor'} •{' '}
              <span className="text-emerald-400 font-semibold">
                Zero-Login Room ({selfRole === 'mentor' ? 'Host' : 'Student'}: {selfName})
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1.5 ${
              connected
                ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-950/60 border-amber-500/30 text-amber-300'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            {peers.length || 1} in room
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-[11px] font-bold text-zinc-300">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            No Google Sign-In Required
          </span>
          <button
            type="button"
            onClick={handleLeave}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer"
            title="Close Live Room"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Stage + Optional Chat Drawer */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Stage Column */}
        <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-5 gap-3 overflow-y-auto">
          {roomEndedBy && (
            <div className="bg-rose-950/70 border border-rose-500/40 rounded-2xl px-4 py-3 text-xs text-rose-100 flex items-center justify-between gap-3">
              <span>
                This live session was ended by <strong className="font-black">{roomEndedBy}</strong>.
              </span>
              <button
                type="button"
                onClick={handleLeave}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-black cursor-pointer"
              >
                Exit Room
              </button>
            </div>
          )}

          {/* Main Spotlight Video */}
          <div className="relative flex-1 min-h-[260px] sm:min-h-[380px] rounded-3xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center">
            {spotlightPeer &&
            spotlightStream &&
            (spotlightPeer.camOn || spotlightPeer.screenSharing) ? (
              <VideoTileStream
                stream={spotlightStream}
                muted={spotlightPeer.peerId === selfPeerId}
                mirrored={spotlightPeer.peerId === selfPeerId && !spotlightPeer.screenSharing}
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <div className="text-center px-6 py-10 space-y-3 max-w-md">
                {spotlightStream && (
                  <VideoTileStream
                    stream={spotlightStream}
                    muted={spotlightPeer?.peerId === selfPeerId}
                    className="hidden"
                  />
                )}
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-2xl font-black mx-auto shadow-xl shadow-blue-900/30">
                  {(spotlightPeer?.displayName || session.instructorName || 'M').slice(0, 2).toUpperCase()}
                </div>
                <div className="space-y-1">
                  <div className="text-base font-black text-white">
                    {spotlightPeer?.role === 'mentor'
                      ? `${spotlightPeer.displayName} (Mentor)`
                      : session.instructorName || 'Mentor Stage'}
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {selfRole === 'mentor'
                      ? 'You are connected as Mentor with zero extra sign-in. Turn on your Camera, Microphone, or Screen Share below to begin teaching.'
                      : peers.some((p) => p.role === 'mentor')
                      ? 'Mentor is in the room! Audio & Live Chat are active — video/screen appears here automatically when Mentor turns it on.'
                      : 'You are in the Live Room! Live Chat is active while waiting for the Mentor to join.'}
                  </p>
                </div>
              </div>
            )}

            {spotlightPeer && (
              <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-xs font-bold flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                    spotlightPeer.role === 'mentor' ? 'bg-blue-600 text-white' : 'bg-zinc-700 text-zinc-200'
                  }`}
                >
                  {spotlightPeer.role === 'mentor' ? 'Mentor' : 'Student'}
                </span>
                <span>{spotlightPeer.displayName}</span>
                {!spotlightPeer.micOn && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
              </div>
            )}
          </div>

          {/* Participant Strip */}
          {otherPeers.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
              {otherPeers.map((peer) => {
                const isSelf = peer.peerId === selfPeerId;
                const stream = isSelf ? localStream : remoteStreams[peer.peerId] || null;
                return (
                  <div
                    key={peer.peerId}
                    className="relative h-28 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center"
                  >
                    {stream && peer.camOn ? (
                      <VideoTileStream
                        stream={stream}
                        muted={isSelf}
                        mirrored={isSelf}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        {stream && <VideoTileStream stream={stream} muted={isSelf} className="hidden" />}
                        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-black text-zinc-200">
                          {peer.displayName.slice(0, 2).toUpperCase()}
                        </div>
                      </>
                    )}
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between gap-1 px-2 py-0.5 rounded-lg bg-black/70 text-[10px] font-bold">
                      <span className="truncate">
                        {peer.displayName}
                        {isSelf ? ' (You)' : ''}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {peer.handRaised && <Hand className="w-3 h-3 text-amber-400" />}
                        {!peer.micOn && <MicOff className="w-3 h-3 text-rose-400" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Chat Drawer */}
        {showChat && (
          <aside className="w-full lg:w-80 xl:w-96 h-64 lg:h-auto border-t lg:border-t-0 lg:border-l border-zinc-800 bg-zinc-900/60 flex flex-col shrink-0">
            <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                Live Class Chat ({chatMessages.length})
              </span>
              <button
                type="button"
                onClick={() => setShowChat(false)}
                className="text-zinc-400 hover:text-white p-1 rounded cursor-pointer lg:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
              {chatMessages.length === 0 ? (
                <div className="text-center text-zinc-500 py-8">
                  No messages yet. Ask questions or greet the class!
                </div>
              ) : (
                chatMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-2xl px-3 py-2 border ${
                      m.role === 'mentor'
                        ? 'bg-blue-950/40 border-blue-500/30'
                        : 'bg-zinc-950/80 border-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-black text-white">{m.senderName}</span>
                      {m.role === 'mentor' && (
                        <span className="px-1.5 py-0.2 rounded bg-blue-600 text-[9px] font-black uppercase">
                          Mentor
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-200 leading-relaxed break-words">{m.text}</p>
                  </div>
                ))
              )}
              <div ref={chatBottomRef} />
            </div>

            <form onSubmit={handleSendChat} className="p-3 border-t border-zinc-800 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:border-blue-500 outline-none"
              />
              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </aside>
        )}
      </div>

      {/* Bottom Controls Dock */}
      <footer className="px-4 py-3 bg-zinc-900 border-t border-zinc-800 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={toggleMic}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
            micOn
              ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
              : 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40'
          }`}
        >
          {micOn ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4" />}
          <span>{micOn ? 'Mic On' : 'Mic Off'}</span>
        </button>

        <button
          type="button"
          onClick={toggleCam}
          className={`px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
            camOn
              ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
              : 'bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 border border-zinc-700'
          }`}
        >
          {camOn ? <Video className="w-4 h-4 text-blue-400" /> : <VideoOff className="w-4 h-4" />}
          <span>{camOn ? 'Cam On' : 'Cam Off'}</span>
        </button>

        {selfRole === 'mentor' && (
          <button
            type="button"
            onClick={toggleScreenShare}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
              screenSharing
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
            }`}
          >
            {screenSharing ? <MonitorOff className="w-4 h-4" /> : <MonitorUp className="w-4 h-4" />}
            <span>{screenSharing ? 'Stop Share' : 'Share Screen'}</span>
          </button>
        )}

        {selfRole === 'student' && (
          <button
            type="button"
            onClick={toggleHandRaise}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
              handRaised
                ? 'bg-amber-500 text-black'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
            }`}
          >
            <Hand className="w-4 h-4" />
            <span>{handRaised ? 'Hand Raised' : 'Raise Hand'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowChat((v) => !v)}
          className="relative px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-black flex items-center gap-2 cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 text-blue-400" />
          <span>Chat</span>
          {unreadChat > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px]">
              {unreadChat}
            </span>
          )}
        </button>

        {selfRole === 'mentor' && (
          <button
            type="button"
            onClick={handleEndClassForAll}
            className="px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black flex items-center gap-2 cursor-pointer"
          >
            <Power className="w-4 h-4" />
            <span>End Class</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleLeave}
          className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-2 cursor-pointer"
        >
          <PhoneOff className="w-4 h-4" />
          <span>Leave</span>
        </button>
      </footer>
    </div>
  );
};
