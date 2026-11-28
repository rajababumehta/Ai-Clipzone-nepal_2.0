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
  Check,
  Edit3,
} from 'lucide-react';
import { Course, SubAdminAccount } from '../types';
import { compressImageFile } from '../utils/chatMedia';
import { getSubAdminCourseIds, getSubAdminCourseTitles } from '../utils/subAdminCourses';

interface AdminSubAdminsTabProps {
  courses: Course[];
  subAdmins: SubAdminAccount[];
  allActivationKeys: any[];
  onCreateSubAdmin: (
    name: string,
    courseIds: string[],
    customCode?: string,
    avatarUrl?: string
  ) => Promise<SubAdminAccount | null>;
  onToggleStatus: (subAdmin: SubAdminAccount) => Promise<void>;
  onUpdateCourse: (subAdmin: SubAdminAccount, courseIds: string[]) => Promise<void>;
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
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>(() =>
    courses[0]?.id ? [courses[0].id] : []
  );
  const [customCodeInput, setCustomCodeInput] = useState('');
  const [avatarInput, setAvatarInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [uploadingForCode, setUploadingForCode] = useState<string | null>(null);
  const [editingCoursesForCode, setEditingCoursesForCode] = useState<string | null>(null);
  const [draftCourseIds, setDraftCourseIds] = useState<string[]>([]);
  const [savingCoursesForCode, setSavingCoursesForCode] = useState<string | null>(null);
  const [subAdminToDelete, setSubAdminToDelete] = useState<SubAdminAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [subAdminToDisable, setSubAdminToDisable] = useState<SubAdminAccount | null>(null);
  const [disableConfirmInput, setDisableConfirmInput] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);

  const toggleCreateCourseId = (courseId: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  const toggleDraftCourseId = (courseId: string) => {
    setDraftCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  const handleNewAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 400, 0.85);
      setAvatarInput(compressed.url);
      showToast('Logo / photo loaded!', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to load photo', 'error');
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
      showToast(err?.message || 'Failed to update photo', 'error');
    } finally {
      setUploadingForCode(null);
      e.target.value = '';
    }
  };

  const handleGenerate = async (autoCopy: boolean) => {
    const cleanName = nameInput.trim();
    const validCourseIds = selectedCourseIds.filter((id) => courses.some((c) => c.id === id));
    if (!cleanName) {
      showToast('Please enter Sub-Admin name', 'error');
      return;
    }
    if (validCourseIds.length === 0) {
      showToast('Please select at least one course', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const created = await onCreateSubAdmin(
        cleanName,
        validCourseIds,
        customCodeInput.trim(),
        avatarInput.trim()
      );
      if (created) {
        if (autoCopy) {
          try {
            await navigator.clipboard.writeText(created.code);
            showToast(
              `Sub-Admin Code "${created.code}" created (${validCourseIds.length} ${validCourseIds.length === 1 ? 'course' : 'courses'}) and copied! 🛡️`,
              'success'
            );
          } catch {
            showToast(`Sub-Admin Code "${created.code}" created! 🛡️`, 'success');
          }
        } else {
          showToast(`Sub-Admin Code "${created.code}" created! 🛡️`, 'success');
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
    const saTitles = getSubAdminCourseTitles(sa, courses).join(' ').toLowerCase();
    return (
      sa.code.toLowerCase().includes(q) ||
      sa.name.toLowerCase().includes(q) ||
      sa.courseTitle.toLowerCase().includes(q) ||
      saTitles.includes(q)
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
            Create Sub-Admin login codes and assign one or multiple courses to each Sub-Admin. A Sub-Admin can view and manage all of their assigned courses (details, payment/QR info, WhatsApp message, live sessions, and student activation codes). Unassigned courses and main site settings stay hidden.
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
              placeholder="e.g. Ramesh (Course Instructor)"
              className="w-full bg-white border border-slate-200 focus:border-purple-500 rounded-xl px-3.5 py-2.5 text-xs transition outline-hidden font-bold text-slate-800"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="block text-[10px] font-black uppercase text-slate-500">
                Assign Courses * ({selectedCourseIds.filter((id) => courses.some((c) => c.id === id)).length} Selected)
              </label>
              {courses.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const allIds = courses.map((c) => c.id);
                    const allSelected = allIds.every((id) => selectedCourseIds.includes(id));
                    setSelectedCourseIds(allSelected ? (courses[0]?.id ? [courses[0].id] : []) : allIds);
                  }}
                  className="text-[10px] font-black text-purple-700 hover:text-purple-900 cursor-pointer"
                >
                  {courses.every((c) => selectedCourseIds.includes(c.id)) ? 'Reset to 1' : 'Select All'}
                </button>
              )}
            </div>
            {courses.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-400">
                No courses available
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto space-y-1.5 bg-white border border-slate-200 rounded-xl p-2">
                {courses.map((course) => {
                  const checked = selectedCourseIds.includes(course.id);
                  return (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => toggleCreateCourseId(course.id)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg border text-xs font-bold transition flex items-center justify-between gap-2 cursor-pointer ${
                        checked
                          ? 'bg-purple-50 border-purple-400 text-purple-900'
                          : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                            checked
                              ? 'bg-purple-600 border-purple-600 text-white'
                              : 'bg-white border-slate-300'
                          }`}
                        >
                          {checked && <Check className="w-3 h-3" />}
                        </span>
                        <span className="truncate">{course.title}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0 font-semibold">
                        {course.price}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-[10px] text-slate-500 mt-1 font-medium">
              Select 1 or multiple courses for this Sub-Admin to manage.
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
              Custom Sub-Admin Code (Optional — auto-generated if empty)
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
              Sub-Admin Logo / Profile Photo (Shown in Admin Ask)
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
                  placeholder="Paste logo URL or click Upload..."
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
              <li>Can edit all assigned course details (title, price, videos, PDFs)</li>
              <li>Can update payment QR and WhatsApp settings for each assigned course</li>
              <li>Can generate and manage student codes for their assigned courses</li>
              <li>Cannot view or modify unassigned courses, site settings, or notifications</li>
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
                <p className="text-sm font-black text-white">No Sub-Admin codes created yet</p>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Use the form on the left to create a dedicated Sub-Admin code for each course.
                </p>
              </div>
            ) : (
              filteredSubAdmins.map((sa) => {
                const isDisabled = sa.status === 'disabled';
                const saCourseIds = getSubAdminCourseIds(sa);
                const saCourseTitles = getSubAdminCourseTitles(sa, courses);
                const isEditingCourses = editingCoursesForCode === sa.code;
                const isSavingCourses = savingCoursesForCode === sa.code;
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
                          title="Upload or change photo / logo"
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
                                const coursesLabel = saCourseTitles.join(', ') || sa.courseTitle;
                                const guide = `🛡️ Sub-Admin Access\nName: ${sa.name}\nAssigned Courses (${saCourseIds.length}): ${coursesLabel}\nLogin Code: ${sa.code}\n\nHow to open:\n1) Go to Profile / Course on the website, enter "${sa.code}" in the Secret Code box, and click Activate.\n2) Once logged in, click the Logo at the top to open your courses dashboard directly.`;
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

                    {/* Assigned Courses Multi-Selector */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                          Assigned Courses ({saCourseIds.length}):
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (isEditingCourses) {
                              setEditingCoursesForCode(null);
                              setDraftCourseIds([]);
                            } else {
                              setEditingCoursesForCode(sa.code);
                              setDraftCourseIds(saCourseIds);
                            }
                          }}
                          className="text-[10px] font-black text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{isEditingCourses ? 'Close' : 'Edit Courses'}</span>
                        </button>
                      </div>

                      {!isEditingCourses ? (
                        <div className="flex flex-wrap gap-1.5">
                          {saCourseTitles.length > 0 ? (
                            saCourseTitles.map((title, idx) => (
                              <span
                                key={`${sa.code}-${idx}`}
                                className="inline-flex items-center gap-1 bg-white border border-purple-200 text-purple-900 text-[11px] font-bold px-2.5 py-1 rounded-lg"
                              >
                                {title}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-rose-600 font-bold">
                              No course assigned
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2 bg-white border border-purple-200 rounded-xl p-2.5">
                          <div className="max-h-40 overflow-y-auto space-y-1">
                            {courses.map((c) => {
                              const checked = draftCourseIds.includes(c.id);
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => toggleDraftCourseId(c.id)}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition flex items-center justify-between gap-2 cursor-pointer ${
                                    checked
                                      ? 'bg-purple-50 border-purple-400 text-purple-900'
                                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${
                                        checked
                                          ? 'bg-purple-600 border-purple-600 text-white'
                                          : 'bg-white border-slate-300'
                                      }`}
                                    >
                                      {checked && <Check className="w-2.5 h-2.5" />}
                                    </span>
                                    <span className="truncate">{c.title}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-500 shrink-0">{c.price}</span>
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-500">
                              {draftCourseIds.length} selected
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isSavingCourses}
                                onClick={() => {
                                  setEditingCoursesForCode(null);
                                  setDraftCourseIds([]);
                                }}
                                className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 text-[10px] font-bold hover:bg-slate-100 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={isSavingCourses || draftCourseIds.length === 0}
                                onClick={async () => {
                                  setSavingCoursesForCode(sa.code);
                                  try {
                                    await onUpdateCourse(sa, draftCourseIds);
                                    setEditingCoursesForCode(null);
                                  } finally {
                                    setSavingCoursesForCode(null);
                                  }
                                }}
                                className="px-3 py-1 rounded-lg bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-[10px] font-black cursor-pointer flex items-center gap-1"
                              >
                                {isSavingCourses && <RefreshCw className="w-3 h-3 animate-spin" />}
                                Save Courses ({draftCourseIds.length})
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

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
                    This Sub-Admin login code will be deleted permanently
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
                  Courses:{' '}
                  <span className="text-slate-900">
                    {getSubAdminCourseTitles(subAdminToDelete, courses).join(', ') || subAdminToDelete.courseTitle}
                  </span>
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
                    This Sub-Admin account will be disabled and its active session logged out.
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
                  Type <span className="text-amber-700 font-mono font-black">CONFIRM</span> below to proceed:
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
