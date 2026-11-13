import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Plus,
  Copy,
  Trash2,
  Power,
  BookOpen,
  UserCheck,
  Search,
  Key,
  Clock,
  RefreshCw,
  Upload,
  Camera,
  X,
} from 'lucide-react';
import { Course, SubAdminAccount } from '../types';
import { compressImageFile } from '../utils/chatMedia';

interface AdminSubAdminsTabProps {
  courses: Course[];
  subAdmins: SubAdminAccount[];
  allActivationKeys: any[];
  onCreateSubAdmin: (
    name: string,
    courseId: string,
    customCode?: string,
    avatarUrl?: string
  ) => Promise<SubAdminAccount | null>;
  onToggleStatus: (subAdmin: SubAdminAccount) => Promise<void>;
  onUpdateCourse: (subAdmin: SubAdminAccount, courseId: string) => Promise<void>;
  onUpdateAvatar?: (subAdmin: SubAdminAccount, avatarUrl: string) => Promise<void>;
  onDeleteSubAdmin: (code: string) => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminSubAdminsTab: React.FC<AdminSubAdminsTabProps> = ({
  courses,
  subAdmins,
  allActivationKeys,
  onCreateSubAdmin,
  onToggleStatus,
  onUpdateCourse,
  onUpdateAvatar,
  onDeleteSubAdmin,
  showToast,
}) => {
  const [nameInput, setNameInput] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState(() => courses[0]?.id || '');
  const [customCodeInput, setCustomCodeInput] = useState('');
  const [avatarInput, setAvatarInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [uploadingForCode, setUploadingForCode] = useState<string | null>(null);
  const [subAdminToDelete, setSubAdminToDelete] = useState<SubAdminAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [subAdminToDisable, setSubAdminToDisable] = useState<SubAdminAccount | null>(null);
  const [disableConfirmInput, setDisableConfirmInput] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);

  const handleNewAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 400, 0.85);
      setAvatarInput(compressed.url);
      showToast('लोगो / फोटो लोड भयो!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'फोटो लोड गर्न सकिएन', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleExistingAvatarUpload = async (
    subAdmin: SubAdminAccount,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateAvatar) return;
    try {
      setUploadingForCode(subAdmin.code);
      const compressed = await compressImageFile(file, 400, 0.85);
      await onUpdateAvatar(subAdmin, compressed.url);
    } catch (err: any) {
      showToast(err?.message || 'फोटो अपडेट गर्न सकिएन', 'error');
    } finally {
      setUploadingForCode(null);
      e.target.value = '';
    }
  };

  const handleGenerate = async (autoCopy: boolean) => {
    const cleanName = nameInput.trim();
    const targetCourseId = selectedCourseId || courses[0]?.id || '';
    if (!cleanName) {
      showToast('कृपया Sub-Admin को नाम लेख्नुहोस् (Please enter Sub-Admin name)', 'error');
      return;
    }
    if (!targetCourseId) {
      showToast('कृपया एउटा कोर्ष छान्नुहोस् (Please select a course)', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const created = await onCreateSubAdmin(
        cleanName,
        targetCourseId,
        customCodeInput.trim(),
        avatarInput.trim()
      );
      if (created) {
        if (autoCopy) {
          try {
            await navigator.clipboard.writeText(created.code);
            showToast(
              `Sub-Admin Code "${created.code}" तयार भयो र Copy गरियो! 🛡️`,
              'success'
            );
          } catch {
            showToast(`Sub-Admin Code "${created.code}" तयार भयो! 🛡️`, 'success');
          }
        } else {
          showToast(`Sub-Admin Code "${created.code}" तयार भयो! 🛡️`, 'success');
        }
        setNameInput('');
        setCustomCodeInput('');
        setAvatarInput('');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const filteredSubAdmins = subAdmins.filter((sa) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      sa.code.toLowerCase().includes(q) ||
      sa.name.toLowerCase().includes(q) ||
      sa.courseTitle.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-purple-950/40 border border-purple-500/30 rounded-2xl p-4 text-xs text-purple-100 font-semibold leading-relaxed flex items-start gap-3">
        <span className="text-base select-none">🛡️</span>
        <div>
          <strong className="font-black text-white text-sm">
            Course-Scoped Sub-Admin Manager (Main Admin Only)
          </strong>
          <p className="mt-1 text-purple-200/80">
            प्रत्येक कोर्षको लागि छुट्टाछुट्टै Sub-Admin लगइन कोड बनाउनुहोस्। Sub-Admin ले केवल आफूलाई तोकिएको कोर्षको मात्र विवरण (Course Details), Payment / QR, WhatsApp सन्देश र विद्यार्थी कोर्ष कोड (Student Course Code) बनाउन र हेर्न सक्नेछन्। अन्य कोर्ष वा मेन सेटिङहरू Sub-Admin लाई देखाइँदैन।
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Create Sub-Admin Code Form */}
        <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200/80 self-start space-y-4">
          <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-purple-600" />
            Create Course Sub-Admin Code
          </h4>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
              Sub-Admin Name / Label *
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="उदा: Ramesh (YouTube Course Admin)"
              className="w-full bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-800"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
              Assign Course (यो Sub-Admin को कोर्ष) *
            </label>
            <select
              value={selectedCourseId || courses[0]?.id || ''}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-800"
            >
              {courses.length === 0 ? (
                <option value="">No courses available</option>
              ) : (
                courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title} ({course.price})
                  </option>
                ))
              )}
            </select>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">
              यो Sub-Admin ले केवल यही छानिएको कोर्ष मात्र सम्पादन गर्न र यसको कोड बनाउन सक्नेछ।
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
              Custom Sub-Admin Code (वैकल्पिक — खाली राखेमा स्वतः बन्छ)
            </label>
            <input
              type="text"
              value={customCodeInput}
              onChange={(e) => setCustomCodeInput(e.target.value.toUpperCase())}
              placeholder="SUB-XXXXXX (Auto if empty)"
              className="w-full bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-mono font-black uppercase tracking-wider text-purple-800"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
              Sub-Admin Logo / Profile Photo (Admin Ask मा देखिने लोगो)
            </label>
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-full bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center shrink-0">
                {avatarInput ? (
                  <img src={avatarInput} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <div className="grow flex items-center gap-1.5">
                <input
                  type="text"
                  value={avatarInput}
                  onChange={(e) => setAvatarInput(e.target.value)}
                  placeholder="Logo URL वा Upload थिच्नुहोस्..."
                  className="w-full bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-3 py-2 text-xs transition outline-hidden font-medium text-slate-700"
                />
                <label className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleNewAvatarUpload}
                    className="hidden"
                  />
                </label>
                {avatarInput && (
                  <button
                    type="button"
                    onClick={() => setAvatarInput('')}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl cursor-pointer transition"
                    title="Clear logo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 space-y-1 font-medium">
            <p className="font-black text-amber-950 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> Sub-Admin Permissions:
            </p>
            <ul className="list-disc pl-4 space-y-0.5 text-[10.5px]">
              <li>Assigned Course Details (Title, Price, Videos, PDFs) मात्र Edit गर्न मिल्ने</li>
              <li>Assigned Course को मात्र Payment (eSewa/Bank/QR) र WhatsApp Message फेर्न मिल्ने</li>
              <li>Assigned Course को मात्र Student Course Code Create/Manage गर्न मिल्ने</li>
              <li>अन्य कोर्ष, Site Settings, FAQs र Notifications हेर्न/फेर्न नमिल्ने</li>
            </ul>
          </div>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={isCreating || courses.length === 0}
              onClick={() => handleGenerate(true)}
              className="w-full bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-xl text-xs shadow-md transition tracking-wider uppercase cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              {isCreating ? 'Creating...' : '🛡️ Generate Sub-Admin Code & Copy'}
            </button>

            <button
              type="button"
              disabled={isCreating || courses.length === 0}
              onClick={() => handleGenerate(false)}
              className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-50 font-extrabold py-2.5 rounded-xl text-xs transition tracking-wider uppercase cursor-pointer"
            >
              Generate Code Only
            </button>
          </div>
        </div>

        {/* Right: Active Sub-Admins Directory */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <h4 className="text-xs font-black uppercase text-zinc-300 tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-purple-400" />
              Active Sub-Admin Accounts ({subAdmins.length})
            </h4>
          </div>

          <div className="mb-3 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search sub-admin by name, code, or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 rounded-xl pl-9 pr-3 py-2 text-xs transition outline-hidden font-medium text-slate-700"
            />
          </div>

          <div className="overflow-y-auto max-h-[470px] space-y-3 pr-1">
            {filteredSubAdmins.length === 0 ? (
              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <p className="text-sm font-black text-white">अहिले कुनै Sub-Admin कोड बनाइएको छैन</p>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  बायाँपट्टिको फारमबाट प्रत्येक कोर्षको लागि छुट्टाछुट्टै Sub-Admin कोड बनाउनुहोस्।
                </p>
              </div>
            ) : (
              filteredSubAdmins.map((sa) => {
                const isDisabled = sa.status === 'disabled';
                const generatedCount = allActivationKeys.filter(
                  (k) => k.createdBySubAdminCode === sa.code
                ).length;

                return (
                  <div
                    key={sa.code}
                    className={`border rounded-2xl p-4 shadow-xs transition space-y-3 ${
                      isDisabled
                        ? 'bg-rose-50/70 border-rose-200'
                        : 'bg-white border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Clickable Logo / Photo for Sub-Admin */}
                        <label
                          className="relative w-12 h-12 rounded-full bg-slate-100 border-2 border-purple-200 hover:border-purple-500 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer group/ava transition shadow-xs"
                          title="फोटो / लोगो अपलोड वा परिवर्तन गर्नुहोस्"
                        >
                          {sa.avatarUrl ? (
                            <img
                              src={sa.avatarUrl}
                              alt={sa.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-black text-purple-700">
                              {(sa.name || 'S').charAt(0).toUpperCase()}
                            </span>
                          )}
                          <div className="absolute inset-0 bg-black/55 opacity-0 group-hover/ava:opacity-100 transition flex items-center justify-center">
                            {uploadingForCode === sa.code ? (
                              <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
                            ) : (
                              <Camera className="w-3.5 h-3.5 text-white" />
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingForCode === sa.code}
                            onChange={(e) => handleExistingAvatarUpload(sa, e)}
                            className="hidden"
                          />
                        </label>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-xs text-purple-800 bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200 tracking-wider">
                              {sa.code}
                            </span>

                            <button
                              type="button"
                              onClick={async () => {
                                await navigator.clipboard.writeText(sa.code);
                                showToast(`Copied Sub-Admin Code: ${sa.code} 📋`, 'info');
                              }}
                              className="text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" /> Copy Code
                            </button>

                            <button
                              type="button"
                              onClick={async () => {
                                const guide = `🛡️ Sub-Admin Access\nName: ${sa.name}\nAssigned Course: ${sa.courseTitle}\nLogin Code: ${sa.code}\n\nकसरी खोल्ने:\n१) वेबसाइटको Profile / Course मा गएर Secret Code बक्समा "${sa.code}" हालेर Activate गर्नुहोस्।\n२) एकपटक लगइन भएपछि माथि रहेको Logo मा क्लिक गर्दा सिधै तपाईंको कोर्षको Dashboard खुल्नेछ।`;
                                await navigator.clipboard.writeText(guide);
                                showToast(`Sub-Admin login instructions copied! 📋`, 'success');
                              }}
                              className="text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition cursor-pointer"
                            >
                              📨 Copy Guide
                            </button>

                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase border ${
                                isDisabled
                                  ? 'bg-rose-100 text-rose-700 border-rose-300'
                                  : 'bg-emerald-100 text-emerald-700 border-emerald-300'
                              }`}
                            >
                              {isDisabled ? '⛔ DISABLED' : '🟢 ACTIVE'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap pt-0.5">
                            <h5 className="text-sm font-black text-slate-900 truncate">
                              {sa.name}
                            </h5>
                            {onUpdateAvatar && sa.avatarUrl && (
                              <button
                                type="button"
                                onClick={() => onUpdateAvatar(sa, '')}
                                className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer"
                              >
                                Remove Photo
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (isDisabled) {
                              onToggleStatus(sa);
                            } else {
                              setDisableConfirmInput('');
                              setSubAdminToDisable(sa);
                            }
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1 border ${
                            isDisabled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                          }`}
                          title={isDisabled ? 'Enable Sub-Admin' : 'Disable Sub-Admin'}
                        >
                          <Power className="w-3 h-3" />
                          <span>{isDisabled ? 'Enable' : 'Disable'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSubAdminToDelete(sa)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                          title="Delete Sub-Admin permanently"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Assigned Course Reassign Selector */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1 shrink-0">
                          <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                          Assigned Course:
                        </label>
                        <select
                          value={sa.courseId}
                          onChange={(e) => onUpdateCourse(sa, e.target.value)}
                          className="bg-white border border-slate-300 focus:border-purple-500 rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-800 outline-hidden max-w-full sm:max-w-xs"
                        >
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                          {!courses.some((c) => c.id === sa.courseId) && (
                            <option value={sa.courseId}>{sa.courseTitle} (Not Found)</option>
                          )}
                        </select>
                      </div>

                      <div className="flex items-center justify-between flex-wrap gap-2 text-[10px] text-slate-500 font-bold pt-1 border-t border-slate-200/70">
                        <span className="flex items-center gap-1">
                          <Key className="w-3 h-3 text-purple-600" />
                          Generated Codes: <strong className="text-slate-800">{generatedCount}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          Created: {new Date(sa.createdAt).toLocaleDateString()}
                        </span>
                        <span>
                          Last Login:{' '}
                          {sa.lastLoginAt
                            ? new Date(sa.lastLoginAt).toLocaleString()
                            : 'Never logged in'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Delete Sub-Admin Confirmation Modal */}
      <AnimatePresence>
        {subAdminToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-rose-200 space-y-4 text-left"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    Delete Sub-Admin Code?
                  </h4>
                  <p className="text-xs text-rose-600 font-bold">
                    यो Sub-Admin लगइन कोड स्थायी रूपमा मेटिनेछ
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                <p className="font-bold text-slate-700">
                  Name: <span className="text-slate-900 font-black">{subAdminToDelete.name}</span>
                </p>
                <p className="font-bold text-slate-700">
                  Code:{' '}
                  <span className="font-mono text-purple-700 font-black">
                    {subAdminToDelete.code}
                  </span>
                </p>
                <p className="font-bold text-slate-700">
                  Course: <span className="text-slate-900">{subAdminToDelete.courseTitle}</span>
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setSubAdminToDelete(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={async () => {
                    setIsDeleting(true);
                    try {
                      await onDeleteSubAdmin(subAdminToDelete.code);
                      setSubAdminToDelete(null);
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isDeleting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Disable Sub-Admin Typed CONFIRM Modal */}
      <AnimatePresence>
        {subAdminToDisable && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-amber-200 space-y-4 text-left"
            >
              <div className="flex items-center gap-3 text-amber-600">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                  <Power className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    Disable & Logout Sub-Admin?
                  </h4>
                  <p className="text-xs text-amber-700 font-bold">
                    यो Sub-Admin खाता बन्द (Disable) हुनेछ र सेसन लगआउट हुनेछ।
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                <p className="font-bold text-slate-700">
                  Name: <span className="text-slate-900 font-black">{subAdminToDisable.name}</span>
                </p>
                <p className="font-bold text-slate-700">
                  Code:{' '}
                  <span className="font-mono text-purple-700 font-black">
                    {subAdminToDisable.code}
                  </span>
                </p>
              </div>

              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 space-y-2">
                <label className="block text-[11px] font-extrabold text-slate-800">
                  पक्का गर्न तल <span className="text-amber-700 font-mono font-black">CONFIRM</span> टाइप गर्नुहोस्:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={disableConfirmInput}
                  onChange={(e) => setDisableConfirmInput(e.target.value)}
                  placeholder="Type CONFIRM"
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-sm text-slate-900 font-mono font-bold focus:border-amber-500 outline-hidden tracking-widest text-center uppercase"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={isDisabling}
                  onClick={() => {
                    setSubAdminToDisable(null);
                    setDisableConfirmInput('');
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={disableConfirmInput.trim().toUpperCase() !== 'CONFIRM' || isDisabling}
                  onClick={async () => {
                    if (disableConfirmInput.trim().toUpperCase() !== 'CONFIRM') return;
                    setIsDisabling(true);
                    try {
                      await onToggleStatus(subAdminToDisable);
                      setSubAdminToDisable(null);
                      setDisableConfirmInput('');
                    } finally {
                      setIsDisabling(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isDisabling ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Power className="w-3.5 h-3.5" />
                  )}
                  Confirm Disable
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
