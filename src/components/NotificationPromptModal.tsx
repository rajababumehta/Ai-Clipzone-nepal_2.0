import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Tag, Sparkles, X, CheckCircle2, ShieldCheck } from 'lucide-react';
import { requestNotificationPermission, showNativeNotification } from '../utils/notifications';

interface NotificationPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionChange?: (permission: NotificationPermission) => void;
  showToast: (msg: string, type: 'success' | 'info' | 'error') => void;
}

export const NotificationPromptModal: React.FC<NotificationPromptModalProps> = ({
  isOpen,
  onClose,
  onPermissionChange,
  showToast
}) => {
  if (!isOpen) return null;

  const handleAllow = async () => {
    const permission = await requestNotificationPermission();
    if (onPermissionChange) {
      onPermissionChange(permission);
    }
    localStorage.setItem('clipzone_notif_prompted', 'true');

    if (permission === 'granted') {
      showToast('🎉 सूचनाहरू सफलतापूर्वक सुचारु गरियो! (Notifications enabled!)', 'success');
      // Send a welcome test push notification
      showNativeNotification({
        title: '🎉 AI Clipzone Nepal मा स्वागत छ!',
        body: 'तपाईंले अब नयाँ कोर्ष, महा-छुट र महत्वपूर्ण सूचनाहरू सिधै प्राप्त गर्नुहुनेछ।',
        url: '/'
      });
      onClose();
    } else if (permission === 'denied') {
      showToast('सूचना अनुमति अस्वीकार गरियो। तपाईं ब्राउचर सेटिङबाट फेरि अन गर्न सक्नुहुन्छ।', 'info');
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
      <div className="fixed inset-0 z-[2500] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-purple-500/30 rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl relative text-left overflow-hidden"
        >
          {/* Subtle Background Glow Accent */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header with App Logo & Bell Icon */}
          <div className="flex items-center gap-3.5 mb-4">
            <div className="relative">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-purple-600 to-blue-500 p-0.5 shadow-lg shadow-purple-500/25 flex items-center justify-center">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Bell className="w-6 h-6 text-purple-400 animate-bounce" />
                </div>
              </div>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-950/80 text-purple-300 border border-purple-500/30">
                <Sparkles className="w-2.5 h-2.5 text-purple-400" /> PWA Smart Alerts
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                Stay Updated with AI Clipzone!
              </h3>
              <p className="text-xs text-purple-300 font-semibold">
                सूचनाहरू तुरुन्त आफ्नो डिभाइसमा पाउनुहोस्
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            नयाँ AI कोर्षहरू, विशेष छुट (Discounts), कुपन कोडहरू र महत्वपूर्ण अपडेटहरू नछुटाइ सबैभन्दा पहिला प्राप्त गर्न सूचनाहरू अन गर्नुहोस्:
          </p>

          {/* Benefit Cards */}
          <div className="space-y-2.5 mb-5">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Tag className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <h4 className="font-bold text-white">Special Discounts & Early-Bird Coupons</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  ५०% सम्मको सीमित अवधिको छुट र नयाँ कुपन कोड सार्वजनिक हुनासाथ सिधै सूचना।
                </p>
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <h4 className="font-bold text-white">New AI Masterclasses & Tools</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  नयाँ ३०+ AI टूल्स, भिडियो मेकिङ पाठहरू र YouTube ब्लुप्रिन्ट कोर्षका नयाँ च्याप्टरहरू।
                </p>
              </div>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <h4 className="font-bold text-white">Important Institute Announcements</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  सर्टिफिकेट वितरण, प्रत्यक्ष सत्रहरू (Live Q&A) र प्राविधिक सहयोग सूचना।
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
            <button
              onClick={handleAllow}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Allow Notifications (सूचना अन गर्नुहोस्)</span>
            </button>
            <button
              onClick={handleDismiss}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer text-center"
            >
              Maybe Later (पछि गर्ने)
            </button>
          </div>

          <p className="text-[10px] text-center text-slate-500 mt-3">
            🔒 तपाईं कुनै पनि समय ब्राउचर सेटिङ वा पोर्टलबाट यो अनुमति परिवर्तन गर्न सक्नुहुन्छ।
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
