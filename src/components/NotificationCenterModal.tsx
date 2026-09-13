import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Tag, 
  Sparkles, 
  X, 
  Volume2, 
  Check, 
  ExternalLink, 
  Info, 
  BookOpen, 
  CheckCheck,
  AlertCircle
} from 'lucide-react';
import { PushNotificationItem } from '../types';
import { requestNotificationPermission, showNativeNotification, getNotificationPermission } from '../utils/notifications';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: PushNotificationItem[];
  unreadIds?: string[];
  onMarkAllRead?: () => void;
  onNotificationClick?: (notif: PushNotificationItem) => void;
  onRequestPermissionPrompt?: () => void;
  showToast?: (msg: string, type: 'success' | 'info' | 'error') => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications = [],
  unreadIds = [],
  onMarkAllRead,
  onNotificationClick,
  onRequestPermissionPrompt,
  showToast
}) => {
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const safeUnreadIds = Array.isArray(unreadIds) ? unreadIds : [];
  const notify = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    if (typeof showToast === 'function') {
      showToast(msg, type);
    } else {
      console.log(msg);
    }
  };

  const [activeFilter, setActiveFilter] = useState<'all' | 'discount' | 'course' | 'announcement'>('all');
  const [permStatus, setPermStatus] = useState<NotificationPermission>(() => getNotificationPermission());

  if (!isOpen) return null;

  const handleEnablePush = async () => {
    if (onRequestPermissionPrompt) {
      onRequestPermissionPrompt();
      return;
    }
    const perm = await requestNotificationPermission();
    setPermStatus(perm);
    if (perm === 'granted') {
      notify('🎉 Push Notifications enabled on this device!', 'success');
      showNativeNotification({
        title: '🔔 AI Clipzone Notifications Active!',
        body: 'You will now receive all course discounts and announcements instantly.',
        url: '/'
      });
    } else if (perm === 'denied') {
      notify('Notifications are blocked in your browser settings. Please allow notifications in site settings.', 'info');
    }
  };

  const filteredNotifications = safeNotifications.filter(n => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'discount') return n.type === 'discount';
    if (activeFilter === 'course') return n.type === 'course';
    if (activeFilter === 'announcement') return n.type === 'announcement' || n.type === 'general' || n.type === 'welcome';
    return true;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'discount':
        return <Tag className="w-4 h-4 text-emerald-400" />;
      case 'course':
        return <BookOpen className="w-4 h-4 text-blue-400" />;
      case 'welcome':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'announcement':
        return <AlertCircle className="w-4 h-4 text-amber-400" />;
      default:
        return <Bell className="w-4 h-4 text-purple-400" />;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'discount':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';
      case 'course':
        return 'bg-blue-950/80 text-blue-300 border-blue-500/40';
      case 'welcome':
        return 'bg-purple-950/80 text-purple-300 border-purple-500/40';
      case 'announcement':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/40';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="fixed inset-0 z-[2200] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs"
      />

      {/* Modal Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-slate-950 border border-zinc-800 max-w-lg w-full rounded-3xl p-5 sm:p-6 shadow-2xl relative z-10 flex flex-col max-h-[85vh] text-left text-zinc-200 overflow-hidden"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">
                  Notifications & Alerts
                </h3>
                {safeUnreadIds.length > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {safeUnreadIds.length} new
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">
                छुट, नयाँ कोर्षहरू र महत्वपूर्ण सूचनाहरू
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {safeNotifications.length > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-[11px] font-bold text-purple-400 hover:text-purple-300 px-2 py-1 rounded-lg hover:bg-purple-950/40 transition cursor-pointer flex items-center gap-1"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">सबै पढियो</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Push Notification Permission Status Banner */}
        <div className="py-2.5 shrink-0">
          {permStatus === 'granted' ? (
            <div className="bg-emerald-950/50 border border-emerald-500/30 rounded-2xl p-2.5 px-3 flex items-center justify-between text-xs text-emerald-300">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-[11px]">Device Push Notifications: Active (सक्रिय)</span>
              </div>
              <button
                onClick={() => {
                  showNativeNotification({
                    title: '🔔 Test Notification',
                    body: 'AI Clipzone notification delivery is working perfectly on this device!',
                    url: '/'
                  });
                  notify('Test push notification sent!', 'info');
                }}
                className="text-[10px] font-black bg-emerald-900/60 hover:bg-emerald-800 px-2 py-1 rounded-lg border border-emerald-500/40 text-emerald-200 transition cursor-pointer"
              >
                Test Alert
              </button>
            </div>
          ) : (
            <div className="bg-purple-950/60 border border-purple-500/40 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <Volume2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-bold text-white text-[11px]">Allow Device Push Notifications</p>
                  <p className="text-[10px] text-purple-300">छुट र अपडेटहरू सिधै स्क्रिनमा प्राप्त गर्नुहोस्</p>
                </div>
              </div>
              <button
                onClick={handleEnablePush}
                className="bg-purple-600 hover:bg-purple-500 text-white font-black text-[11px] px-3 py-1.5 rounded-xl shadow-md transition cursor-pointer shrink-0"
              >
                Allow (अन गर्नुहोस्)
              </button>
            </div>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 pb-2 overflow-x-auto scrollbar-none shrink-0 border-b border-zinc-800/80">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            सबै ({safeNotifications.length})
          </button>
          <button
            onClick={() => setActiveFilter('discount')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              activeFilter === 'discount'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Tag className="w-3 h-3" />
            छुट (Discounts)
          </button>
          <button
            onClick={() => setActiveFilter('course')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              activeFilter === 'course'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            नयाँ कोर्ष (Courses)
          </button>
          <button
            onClick={() => setActiveFilter('announcement')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              activeFilter === 'announcement'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <AlertCircle className="w-3 h-3" />
            सूचना (Notices)
          </button>
        </div>

        {/* Notifications List */}
        <div className="grow overflow-y-auto py-2 space-y-2.5 pr-1">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-3 text-zinc-600">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-zinc-400">कुनै नयाँ सूचना छैन (No notifications)</p>
              <p className="text-[11px] text-zinc-600 mt-1">
                प्रशासकले पठाएका नयाँ अफर र छुटहरू यहाँ देखा पर्नेछन्।
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const isUnread = safeUnreadIds.includes(notif.id);
              const formattedDate = new Date(notif.createdAt).toLocaleDateString('ne-NP', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (onNotificationClick) onNotificationClick(notif);
                  }}
                  className={`p-3.5 rounded-2xl border transition text-left cursor-pointer relative ${
                    isUnread
                      ? 'bg-slate-900/90 border-purple-500/50 shadow-md shadow-purple-950/30'
                      : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  {isUnread && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-purple-400 ring-4 ring-purple-500/20" />
                  )}

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center shrink-0 mt-0.5">
                      {getTypeIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getTypeBadgeClass(notif.type)}`}>
                          {notif.badge || notif.type.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {formattedDate}
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                        {notif.title}
                      </h4>
                      <p className="text-xs text-zinc-300 mt-1 leading-relaxed whitespace-pre-line">
                        {notif.body}
                      </p>

                      {notif.url && (
                        <div className="mt-2.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-400 hover:text-purple-300">
                            हेर्नुहोस् (Open Link) <ExternalLink className="w-3 h-3" />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
};
