import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Pencil, Trash2, X, Check, UserPlus, UserMinus,
  BookOpen, ChevronRight, Search, GraduationCap, Send, User
} from 'lucide-react';
import { PageLayout } from '@/layouts/PageLayout';
import {
  getClasses, createClass, updateClass, deleteClass,
  getClassMembers, addStudentToClass, removeStudentFromClass,
  assignSheetToClass, getAllStudents, getSheets
} from '@/services/supabase';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/components/Toast';
import { useLanguageStore } from '@/store/languageStore';

// ─── Types ──────────────────────────────────────────────────────────────────
type Cls = { id: string; name: string; description: string; created_at: string };
type Student = { id: string; first_name: string; last_name: string; email: string; avatar_url?: string };
type Sheet = { id: string; title: string };

// ─── Small helpers ──────────────────────────────────────────────────────────
const Avatar = ({ s }: { s: Student }) =>
  s.avatar_url ? (
    <img src={s.avatar_url} className="w-9 h-9 rounded-full object-cover" alt={s.first_name} />
  ) : (
    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
      <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
    </div>
  );

// ─── ClassCard ───────────────────────────────────────────────────────────────
const ClassCard = ({
  cls, memberCount, onOpen, onEdit, onDelete
}: {
  cls: Cls; memberCount: number;
  onOpen: () => void; onEdit: () => void; onDelete: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all group"
  >
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{cls.name}</h3>
          {cls.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{cls.description}</p>
          )}
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-blue-500 transition-colors">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>

    <div className="flex items-center gap-2 mb-5 text-sm text-gray-500 dark:text-gray-400">
      <Users className="w-4 h-4" />
      <span>{memberCount} оқушы</span>
    </div>

    <button
      onClick={onOpen}
      className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl font-semibold text-sm hover:bg-blue-600 hover:text-white transition-all"
    >
      Топты басқару
      <ChevronRight className="w-4 h-4" />
    </button>
  </motion.div>
);

// ─── ClassFormModal ──────────────────────────────────────────────────────────
const ClassFormModal = ({
  initial, onSave, onClose
}: {
  initial?: { name: string; description: string };
  onSave: (name: string, desc: string) => void;
  onClose: () => void;
}) => {
  const [name, setName] = useState(initial?.name || '');
  const [desc, setDesc] = useState(initial?.description || '');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {initial ? 'Топты өңдеу' : 'Жаңа топ жасау'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Топ атауы *</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="мыс. 9A сыныбы"
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Сипаттама</label>
            <textarea
              value={desc} onChange={e => setDesc(e.target.value)}
              rows={3} placeholder="Топ туралы қосымша ақпарат..."
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Бас тарту</button>
          <button
            onClick={() => name.trim() && onSave(name.trim(), desc.trim())}
            disabled={!name.trim()}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Check className="w-4 h-4 inline mr-1" />
            {initial ? 'Сақтау' : 'Жасау'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── ClassDetailModal ────────────────────────────────────────────────────────
const ClassDetailModal = ({
  cls, allStudents, onClose, onRefresh
}: {
  cls: Cls; allStudents: Student[];
  onClose: () => void; onRefresh: () => void;
}) => {
  const { showToast } = useToast();
  const [members, setMembers] = useState<Student[]>([]);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [assignSheet, setAssignSheet] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [tab, setTab] = useState<'students' | 'assign'>('students');

  useEffect(() => {
    Promise.all([
      getClassMembers(cls.id),
      getSheets()
    ]).then(([m, s]) => {
      setMembers(m as Student[]);
      setSheets((s || []) as Sheet[]);
    }).finally(() => setLoading(false));
  }, [cls.id]);

  const memberIds = new Set(members.map(m => m.id));

  const filteredAvailable = allStudents.filter(s =>
    !memberIds.has(s.id) &&
    `${s.first_name} ${s.last_name} ${s.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (s: Student) => {
    await addStudentToClass(cls.id, s.id);
    setMembers(prev => [...prev, s]);
    showToast(`${s.first_name} ${s.last_name} топқа қосылды`, 'success');
  };

  const handleRemove = async (s: Student) => {
    await removeStudentFromClass(cls.id, s.id);
    setMembers(prev => prev.filter(m => m.id !== s.id));
    showToast(`${s.first_name} ${s.last_name} топтан шығарылды`, 'success');
  };

  const handleAssign = async () => {
    if (!assignSheet) return;
    setAssigning(true);
    try {
      const count = await assignSheetToClass(assignSheet, cls.id);
      showToast(`Вариант ${count} оқушыға жіберілді!`, 'success');
      setAssignSheet('');
    } catch (e: any) {
      showToast(e.message || 'Қате орын алды', 'error');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{cls.name}</h2>
            {cls.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{cls.description}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6 shrink-0">
          {(['students', 'assign'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              {t === 'students' ? `Оқушылар (${members.length})` : 'Тапсырма жіберу'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : tab === 'students' ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Members list */}
            <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 shrink-0">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Топ мүшелері</p>
              </div>
              <div className="overflow-y-auto flex-1">
                {members.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">Оқушылар жоқ</div>
                ) : members.map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <Avatar s={s} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-gray-400 truncate">{s.email}</p>
                    </div>
                    <button onClick={() => handleRemove(s)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 transition-colors">
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Available students */}
            <div className="w-1/2 flex flex-col overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 shrink-0">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Қосу</p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Оқушы іздеу..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div className="overflow-y-auto flex-1">
                {filteredAvailable.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">Оқушылар табылмады</div>
                ) : filteredAvailable.map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <Avatar s={s} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-gray-400 truncate">{s.email}</p>
                    </div>
                    <button onClick={() => handleAdd(s)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-300 hover:text-blue-500 transition-colors">
                      <UserPlus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Assign tab */
          <div className="p-6 space-y-5 overflow-y-auto">
            {members.length === 0 ? (
              <div className="text-center py-8 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-200 dark:border-yellow-800">
                <Users className="w-10 h-10 mx-auto text-yellow-400 mb-2" />
                <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">Топта оқушылар жоқ</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-1">Алдымен оқушыларды топқа қосыңыз</p>
              </div>
            ) : (
              <>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                      {members.length} оқушыға жіберіледі
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {members.map(m => (
                      <span key={m.id} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
                        {m.first_name} {m.last_name}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <BookOpen className="w-4 h-4 inline mr-1" />
                    Вариантты таңдаңыз
                  </label>
                  <select
                    value={assignSheet}
                    onChange={e => setAssignSheet(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">— Вариант таңдаңыз —</option>
                    {sheets.map(s => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleAssign}
                  disabled={!assignSheet || assigning}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {assigning ? <LoadingSpinner /> : <Send className="w-4 h-4" />}
                  {assigning ? 'Жіберілуде...' : 'Топқа вариант жіберу'}
                </button>
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ─── Main page ───────────────────────────────────────────────────────────────
export const Classes = () => {
  const { showToast } = useToast();
  const [classes, setClasses] = useState<Cls[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Cls | null>(null);
  const [detailTarget, setDetailTarget] = useState<Cls | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Cls | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [cls, students] = await Promise.all([getClasses(), getAllStudents()]);
      setClasses(cls);
      setAllStudents((students || []) as Student[]);
      // load member counts
      const counts: Record<string, number> = {};
      await Promise.all(cls.map(async (c) => {
        const m = await getClassMembers(c.id);
        counts[c.id] = m.length;
      }));
      setMemberCounts(counts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (name: string, desc: string) => {
    await createClass(name, desc);
    showToast('Топ сәтті жасалды!', 'success');
    setShowCreate(false);
    load();
  };

  const handleEdit = async (name: string, desc: string) => {
    if (!editTarget) return;
    await updateClass(editTarget.id, { name, description: desc });
    showToast('Топ жаңартылды', 'success');
    setEditTarget(null);
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteClass(deleteTarget.id);
    showToast('Топ жойылды', 'success');
    setDeleteTarget(null);
    load();
  };

  if (loading) return <PageLayout><div className="flex justify-center py-20"><LoadingSpinner /></div></PageLayout>;

  return (
    <PageLayout maxWidth="xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-blue-600" />
            Оқу топтары
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Сыныптар мен топтарды басқарыңыз, тапсырмаларды бір уақытта жіберіңіз
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow transition-all"
        >
          <Plus className="w-5 h-5" />
          Жаңа топ
        </button>
      </div>

      {/* Grid */}
      {classes.length === 0 ? (
        <div className="text-center py-24 bg-gray-50 dark:bg-gray-800/50 rounded-3xl">
          <GraduationCap className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-xl font-semibold text-gray-500 dark:text-gray-400 mb-2">Топтар жоқ</p>
          <p className="text-gray-400 text-sm mb-6">«Жаңа топ» батырмасын басып, алғашқы сыныбыңызды жасаңыз</p>
          <button onClick={() => setShowCreate(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4 inline mr-2" />
            Жаңа топ жасау
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map(cls => (
            <ClassCard
              key={cls.id}
              cls={cls}
              memberCount={memberCounts[cls.id] ?? 0}
              onOpen={() => setDetailTarget(cls)}
              onEdit={() => setEditTarget(cls)}
              onDelete={() => setDeleteTarget(cls)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <ClassFormModal onSave={handleCreate} onClose={() => setShowCreate(false)} />
        )}
        {editTarget && (
          <ClassFormModal
            initial={{ name: editTarget.name, description: editTarget.description }}
            onSave={handleEdit}
            onClose={() => setEditTarget(null)}
          />
        )}
        {detailTarget && (
          <ClassDetailModal
            cls={detailTarget}
            allStudents={allStudents}
            onClose={() => { setDetailTarget(null); load(); }}
            onRefresh={load}
          />
        )}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <motion.div initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Топты жою</h3>
                  <p className="text-sm text-gray-500">{deleteTarget.name}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Бұл топты жойсаңыз оның барлық мүшелері тізімнен шығарылады. Жалғастырасыз ба?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Бас тарту
                </button>
                <button onClick={handleDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors">
                  Жою
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </PageLayout>
  );
};

export default Classes;
