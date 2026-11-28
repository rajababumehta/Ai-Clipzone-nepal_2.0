import React, { useState } from 'react';
import { 
  Bell, 
  Send, 
  Tag, 
  Sparkles, 
  BookOpen, 
  AlertCircle, 
  Trash2, 
  ExternalLink, 
  RefreshCw, 
  Smartphone, 
  CheckCircle2, 
  Radio, 
  Copy,
  Info
} from 'lucide-react';
import { PushNotificationItem } from '../types';
import { showNativeNotification, requestNotificationPermission } from '../utils/notifications';

interface AdminNotificationsTabProps {
  notifications?: PushNotificationItem[];
  onSendNotification: (notif: Omit<PushNotificationItem, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteNotification: (id: string) => Promise<void>;
  showToast: (msg: string, type: 'success' | 'info' | 'error') => void;
  instituteName?: string;
  instituteLogoUrl?: string;
}

export const AdminNotificationsTab: React.FC<AdminNotificationsTabProps> = ({
  notifications = [],
  onSendNotification,
  onDeleteNotification,
  showToast: showToastProp,
  instituteName = 'HamroLms',
  instituteLogoUrl = '/pwa-192x192.png'
}) => {
  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    if (typeof showToastProp === 'function') {
      showToastProp(msg, type);
    } else {
      console.log(msg);
    }
  };
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  // Form fields
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<'discount' | 'welcome' | 'announcement' | 'course' | 'general'>('discount');
  const [badge, setBadge] = useState('50% OFF');
  const [url, setUrl] = useState('');
  const [target, setTarget] = useState<'all' | 'students'>('all');
  const [isSending, setIsSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Quick Preset Handlers
  const applyPreset = (presetType: 'discount' | 'welcome' | 'course' | 'announcement') => {
    switch (presetType) {
      case 'discount':
        setTitle('🎉 Special Offer: 50% OFF AI Masterclass!');
        setBody('For a limited time, get the AI Video Editing & 30+ AI Tools course for only Rs. 449. Reserve your seat today!');
        setType('discount');
        setBadge('50% OFF');
        setUrl('/#courses');
        break;
      case 'welcome':
        setTitle('✨ Welcome to HamroLms!');
        setBody('Start your AI learning journey today. Unlock premium video lessons, prompt packs, and verified certificates.');
        setType('welcome');
        setBadge('WELCOME');
        setUrl('/');
        break;
      case 'course':
        setTitle('🔥 New Course: YouTube Blueprint Masterclass Live!');
        setBody('Our complete blueprint course on launching a YouTube channel and growing viral videos is now live. Check it out today!');
        setType('course');
        setBadge('NEW COURSE');
        setUrl('/#courses');
        break;
      case 'announcement':
        setTitle('📢 Important Notice: New Features & Updates!');
        setBody('New PDF study notes, chapter playlists, and digital certificate verification have been added to HamroLms.');
        setType('announcement');
        setBadge('NOTICE');
        setUrl('/');
        break;
    }
    showToast('Preset template loaded into form!', 'info');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      showToast('Please enter both notification title and message body.', 'error');
      return;
    }

    try {
      setIsSending(true);
      await onSendNotification({
        title: title.trim(),
        body: body.trim(),
        type,
        badge: badge.trim() || undefined,
        url: url.trim() || undefined,
        target,
        author: 'Admin'
      });

      // Also trigger a preview push on admin's device if allowed
      showNativeNotification({
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || '/'
      });

      showToast('📢 Notification broadcasted successfully to all users!', 'success');
      // Reset form
      setTitle('');
      setBody('');
      setUrl('');
    } catch (err) {
      console.error('Send broadcast error:', err);
      showToast('Failed to send notification. Please try again.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleTestDevicePush = async () => {
    if (!title.trim() && !body.trim()) {
      showToast('Please fill out title and body or select a preset template to test.', 'info');
      return;
    }
    const perm = await requestNotificationPermission();
    if (perm === 'granted') {
      const delivered = await showNativeNotification({
        title: title.trim() || '🔔 HamroLms Preview Alert',
        body: body.trim() || 'This is how your broadcast appears on student devices and browsers.',
        url: url.trim() || '/'
      });
      if (delivered) {
        showToast('Test notification sent to your screen!', 'success');
      } else {
        showToast('Unable to deliver native notification. Check browser settings.', 'info');
      }
    } else {
      showToast('Notification permission denied or blocked in browser settings.', 'error');
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Overview Info Banner */}
      <div className="bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-slate-900 border border-purple-500/30 rounded-2xl p-4 text-xs text-purple-200 flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0 text-purple-400">
          <Radio className="w-5 h-5 animate-pulse" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-extrabold text-white text-sm">
              Admin Push Notifications &amp; Broadcast Hub
            </h4>
            <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
              PWA &amp; Mobile Push
            </span>
          </div>
          <p className="text-[11px] text-zinc-300 leading-relaxed">
            Notifications sent here will appear immediately on user browsers and PWA mobile screens and remain saved in the app <strong>Notification Center</strong>.
          </p>
        </div>
      </div>

      {/* Quick Presets Section */}
      <div>
        <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wider mb-2.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Quick Preset Templates
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => applyPreset('discount')}
            className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 hover:bg-emerald-900/50 hover:border-emerald-400 text-left transition cursor-pointer group"
          >
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-black">
              <Tag className="w-3.5 h-3.5" /> 50% Special Discount
            </div>
            <p className="text-[10px] text-zinc-400 mt-1 line-clamp-1 group-hover:text-zinc-200">
              Special discount &amp; coupon offer
            </p>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('welcome')}
            className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 hover:bg-purple-900/50 hover:border-purple-400 text-left transition cursor-pointer group"
          >
            <div className="flex items-center gap-1.5 text-purple-400 text-xs font-black">
              <Sparkles className="w-3.5 h-3.5" /> Welcome Greeting
            </div>
            <p className="text-[10px] text-zinc-400 mt-1 line-clamp-1 group-hover:text-zinc-200">
              Welcome message &amp; quick guide
            </p>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('course')}
            className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30 hover:bg-blue-900/50 hover:border-blue-400 text-left transition cursor-pointer group"
          >
            <div className="flex items-center gap-1.5 text-blue-400 text-xs font-black">
              <BookOpen className="w-3.5 h-3.5" /> New Course Launch
            </div>
            <p className="text-[10px] text-zinc-400 mt-1 line-clamp-1 group-hover:text-zinc-200">
              New AI masterclass &amp; chapters
            </p>
          </button>

          <button
            type="button"
            onClick={() => applyPreset('announcement')}
            className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 hover:bg-amber-900/50 hover:border-amber-400 text-left transition cursor-pointer group"
          >
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-black">
              <AlertCircle className="w-3.5 h-3.5" /> Important Notice
            </div>
            <p className="text-[10px] text-zinc-400 mt-1 line-clamp-1 group-hover:text-zinc-200">
              Platform news &amp; feature updates
            </p>
          </button>
        </div>
      </div>

      {/* Main Composer & Live Mockup Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column (7 cols) */}
        <form onSubmit={handleSend} className="lg:col-span-7 space-y-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 sm:p-5">
          <h4 className="text-xs font-black uppercase text-purple-400 tracking-wider flex items-center gap-1.5">
            ✍️ Compose Notification Broadcast
          </h4>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">
              Notification Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 🎉 Special Offer: 50% OFF AI Masterclass!"
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-purple-500 focus:outline-hidden transition"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">
              Message Body *
            </label>
            <textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="e.g. For a limited time, get the 30+ AI Tools course for only Rs. 449. Enroll today!"
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-purple-500 focus:outline-hidden transition resize-none leading-relaxed"
            />
          </div>

          {/* Type & Badge in row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Category / Type
              </label>
              <select
                value={type}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setType(val);
                  if (val === 'discount' && !badge) setBadge('50% OFF');
                  if (val === 'course' && !badge) setBadge('NEW COURSE');
                  if (val === 'welcome' && !badge) setBadge('WELCOME');
                  if (val === 'announcement' && !badge) setBadge('NOTICE');
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-purple-500 focus:outline-hidden transition cursor-pointer"
              >
                <option value="discount">🎁 Discount / Offer</option>
                <option value="welcome">✨ Welcome Greeting</option>
                <option value="course">🎓 Course Launch</option>
                <option value="announcement">📢 Announcement</option>
                <option value="general">💡 General Update</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Badge / Tag
              </label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="e.g. 50% OFF, NEW, NOTICE"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-purple-500 focus:outline-hidden transition"
              />
            </div>
          </div>

          {/* URL & Target in row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Action URL / Link (Optional)
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g. /#courses or https://..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-purple-500 focus:outline-hidden transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Target Audience
              </label>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value as any)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-purple-500 focus:outline-hidden transition cursor-pointer"
              >
                <option value="all">🌐 All App Users</option>
                <option value="students">🎓 Enrolled Students Only</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSending}
              className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black text-xs shadow-md shadow-purple-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {isSending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>
                {isSending ? 'Sending Broadcast...' : 'Broadcast to All'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleTestDevicePush}
              className="py-2.5 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs border border-zinc-700 transition cursor-pointer flex items-center gap-1.5"
              title="Test how this looks directly on your current device"
            >
              <Smartphone className="w-3.5 h-3.5 text-purple-400" />
              <span>Test on My Screen</span>
            </button>
          </div>
        </form>

        {/* Live Mobile & Desktop Mockup (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 sm:p-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                Live Notification Preview
              </h4>
              <span className="text-[10px] text-zinc-500">Android / iOS / Desktop</span>
            </div>

            {/* Mobile Lockscreen Notification Card Simulation */}
            <div className="bg-slate-950/90 border border-purple-500/40 rounded-2xl p-3.5 shadow-xl space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between text-[10px] text-zinc-400 pb-1.5 border-b border-zinc-800/80">
                <div className="flex items-center gap-1.5">
                  <img
                    src={instituteLogoUrl || '/logo.png'}
                    alt="Logo"
                    className="w-3.5 h-3.5 rounded-md object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/logo.png';
                    }}
                  />
                  <span className="font-bold text-zinc-200">{instituteName}</span>
                </div>
                <span>Just now</span>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  {type === 'discount' && <Tag className="w-3.5 h-3.5 text-emerald-400" />}
                  {type === 'course' && <BookOpen className="w-3.5 h-3.5 text-blue-400" />}
                  {type === 'welcome' && <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
                  {type === 'announcement' && <AlertCircle className="w-3.5 h-3.5 text-amber-400" />}
                  {type === 'general' && <Bell className="w-3.5 h-3.5 text-zinc-300" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {badge && (
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded-md bg-purple-900/60 text-purple-300 border border-purple-500/30">
                        {badge}
                      </span>
                    )}
                    <h5 className="text-xs font-bold text-white truncate">
                      {title || '🎉 Special Offer: 50% Discount on AI Courses!'}
                    </h5>
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-snug line-clamp-3">
                    {body || 'For a limited time, get a special discount on 30+ AI tools and video editing courses.'}
                  </p>
                </div>
              </div>

              {url && (
                <div className="pt-1 flex items-center justify-end text-[10px] font-bold text-purple-400">
                  Tap to view details →
                </div>
              )}
            </div>
          </div>

          <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3 text-[11px] text-zinc-400 space-y-1 mt-4">
            <div className="flex items-center gap-1.5 text-zinc-300 font-bold">
              <Info className="w-3.5 h-3.5 text-purple-400" />
              PWA Push Delivery:
            </div>
            <p className="text-[10px] leading-relaxed">
              Once users install the PWA or enable notification permissions, this alert will be delivered even when the app is in the background.
            </p>
          </div>
        </div>
      </div>

      {/* Broadcast History Table */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-black uppercase text-zinc-400 tracking-wider">
              📋 Sent Broadcasts History ({safeNotifications.length})
            </h4>
            <span className="text-[10px] text-zinc-500">All notifications sent so far</span>
          </div>
        </div>

        {safeNotifications.length === 0 ? (
          <div className="py-8 text-center text-zinc-500">
            <Bell className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
            <p className="text-xs font-semibold">No broadcast sent yet</p>
            <p className="text-[11px] text-zinc-600 mt-0.5">Send your first notification using the form above.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80 max-h-72 overflow-y-auto">
            {safeNotifications.map((notif) => {
              const formattedDate = new Date(notif.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div key={notif.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/30">
                        {notif.badge || notif.type.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-zinc-500">{formattedDate}</span>
                      <span className="text-[10px] text-zinc-500 font-semibold">• Target: {notif.target === 'students' ? 'Students' : 'All'}</span>
                    </div>

                    <h5 className="font-bold text-white text-xs mb-0.5">{notif.title}</h5>
                    <p className="text-[11px] text-zinc-300 leading-snug line-clamp-2">{notif.body}</p>

                    {notif.url && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-purple-400 mt-1">
                        Link: {notif.url}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        showNativeNotification({
                          title: notif.title,
                          body: notif.body,
                          url: notif.url || '/'
                        });
                        showToast('Triggered push on your device!', 'info');
                      }}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
                      title="Test on device"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                    </button>

                    <button
                      type="button"
                      disabled={deletingId === notif.id}
                      onClick={async () => {
                        try {
                          setDeletingId(notif.id);
                          await onDeleteNotification(notif.id);
                          showToast('Notification deleted from database.', 'info');
                        } catch (err) {
                          showToast('Failed to delete notification.', 'error');
                        } finally {
                          setDeletingId(null);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-200 border border-rose-500/30 transition cursor-pointer"
                      title="Delete notification permanently"
                    >
                      {deletingId === notif.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
