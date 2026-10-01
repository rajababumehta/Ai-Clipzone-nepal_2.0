import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X } from 'lucide-react';
import { requestNotificationPermission, showNativeNotification } from '../utils/notifications';

interface NotificationPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionChange?: (permission: NotificationPermission) => void;
  onPermissionGranted?: () => void;
  showToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const NotificationPromptModal: React.FC<NotificationPromptModalProps> = ({
  isOpen,
  onClose,
  onPermissionChange,
  onPermissionGranted,
  showToast
}) => {
  if (!isOpen) return null;

  const notify = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    if (typeof showToast === 'function') {
      showToast(msg, type);
    } else {
      console.log(msg);
    }
  };

  const handleAllow = async () => {
    const permission = await requestNotificationPermission();
    if (onPermissionChange) {
      onPermissionChange(permission);
    }
    localStorage.setItem('clipzone_notif_prompted', 'true');

    if (permission === 'granted') {
      if (onPermissionGranted) {
        onPermissionGranted();
      } else {
        notify('🎉 Notifications enabled!', 'success');
      }
      showNativeNotification({
        title: '🎉 AI Clipzone',
        body: 'Notifications enabled successfully.',
        url: '/'
      });
      onClose();
    } else {
      onClose();
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('clipzone_notif_prompted', 'true');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-xs w-full shadow-2xl relative text-center overflow-hidden flex flex-col items-center"
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Bell Icon */}
          <div className="w-14 h-14 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/10">
            <Bell className="w-7 h-7 text-blue-400" />
          </div>

          {/* Simple Title */}
          <h3 className="text-lg font-bold text-white tracking-tight mb-5">
            Allow Notifications
          </h3>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-2">
            <button
              onClick={handleAllow}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
            >
              <span>Allow Notifications</span>
            </button>
            <button
              onClick={handleDismiss}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 font-semibold text-xs transition cursor-pointer"
            >
              Later
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
