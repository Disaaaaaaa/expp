import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  TrendingUp, Users, CheckCircle, BookOpen, Award,
  GraduationCap, Clock, Target, ChevronUp, ChevronDown,
  BarChart2, User, Medal, Star, Zap
} from 'lucide-react';
import { PageLayout } from '@/layouts/PageLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { fetchAnalytics, type AnalyticsData, type ClassStat, type StudentStat } from '@/services/analyticsService';

// ─── Animated counter ────────────────────────────────────────────────────────
const Counter = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = Math.ceil(value / 40);
    const t = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(t); }
      else setDisplay(start);
    }, 20);
    return () => clearInterval(t);
  }, [inView, value]);
  return <span ref={ref}>{display}{suffix}</span>;
};

// ─── Stat card ───────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, suffix = '', color, sub }:
  { icon: React.ReactNode; label: string; value: number; suffix?: string; color: string; sub?: string }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow border border-gray-100 dark:border-gray-700">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${color}`}>
      {icon}
    </div>
    <div className="text-3xl font-black text-gray-900 dark:text-white mb-0.5">
      <Counter value={value} suffix={suffix} />
    </div>
    <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">{label}</div>
    {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
  </motion.div>
);

// ─── Horizontal bar ──────────────────────────────────────────────────────────
const HBar = ({ value, max, color = 'bg-blue-500', label }:
  { value: number; max: number; color?: string; label?: string }) => {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-xs text-gray-500 w-20 truncate shrink-0">{label}</span>}
      <div className="flex-1 h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <span className="text-xs font-bold text-gray-600 dark:text-gray-300 w-9 text-right shrink-0">{pct}%</span>
    </div>
  );
};

// ─── SVG Donut chart ─────────────────────────────────────────────────────────
const Donut = ({ pct, color, size = 72 }: { pct: number; color: string; size?: number }) => {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor"
        strokeWidth="8" className="text-gray-100 dark:text-gray-700" />
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${circ}`}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  );
};

// ─── SVG Bar chart ────────────────────────────────────────────────────────────
const BarChart = ({ data, color = '#3b82f6' }:
  { data: { label: string; value: number }[]; color?: string }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 600; const H = 180; const barW = Math.min(60, (W - 40) / data.length - 8);
  const gap = (W - 40) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 36}`} className="w-full">
      {/* grid */}
      {[0, 25, 50, 75, 100].map(v => {
        const y = H - (v / 100) * H;
        return <g key={v}>
          <line x1={20} y1={y} x2={W} y2={y} stroke="#e5e7eb" strokeWidth="0.5" />
          <text x={14} y={y + 4} fontSize="9" fill="#9ca3af" textAnchor="end">{v}</text>
        </g>;
      })}
      {data.map((d, i) => {
        const x = 20 + i * gap + (gap - barW) / 2;
        const pct = max ? (d.value / max) * 100 : 0;
        const bH = (pct / 100) * H;
        return (
          <g key={i}>
            <motion.rect
              x={x} y={H - bH} width={barW} rx={4}
              initial={{ height: 0, y: H }}
              animate={{ height: bH, y: H - bH }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: 'easeOut' }}
              fill={color} opacity={0.85}
            />
            <text x={x + barW / 2} y={H + 14} fontSize="9" fill="#6b7280" textAnchor="middle"
              className="max-w-[50px]">
              {d.label.length > 7 ? d.label.slice(0, 6) + '…' : d.label}
            </text>
            <text x={x + barW / 2} y={H - bH - 5} fontSize="9" fill="#374151" textAnchor="middle"
              fontWeight="bold">
              {d.value}%
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// ─── Medal ────────────────────────────────────────────────────────────────────
const MedalBadge = ({ rank }: { rank: number }) => {
  const cfg = [
    { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600', label: '🥇' },
    { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-500', label: '🥈' },
    { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600', label: '🥉' },
  ];
  if (rank <= 3) return (
    <div className={`w-8 h-8 rounded-full ${cfg[rank-1].bg} flex items-center justify-center text-base`}>
      {cfg[rank-1].label}
    </div>
  );
  return (
    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500">
      {rank}
    </div>
  );
};

// ─── Student row ──────────────────────────────────────────────────────────────
const StudentRow = ({ st, rank }: { st: StudentStat; rank: number }) => (
  <motion.tr
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: rank * 0.04 }}
    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
  >
    <td className="px-4 py-3">
      <div className="flex items-center gap-2">
        <MedalBadge rank={rank} />
      </div>
    </td>
    <td className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">{st.first_name} {st.last_name}</div>
          <div className="text-xs text-gray-400">{st.email}</div>
        </div>
      </div>
    </td>
    <td className="px-4 py-3">
      <div className="flex flex-wrap gap-1">
        {st.classNames.map(cn => (
          <span key={cn} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
            {cn}
          </span>
        ))}
      </div>
    </td>
    <td className="px-4 py-3 text-center">
      <span className="text-sm font-bold text-gray-900 dark:text-white">{st.totalTasks}</span>
    </td>
    <td className="px-4 py-3 text-center">
      <span className="text-sm font-bold text-green-600">{st.correctTasks}</span>
    </td>
    <td className="px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${st.accuracy}%` }}
            transition={{ duration: 0.8, delay: rank * 0.04 }}
            className={`h-full rounded-full ${st.accuracy >= 70 ? 'bg-green-500' : st.accuracy >= 40 ? 'bg-yellow-500' : 'bg-red-400'}`}
          />
        </div>
        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 w-9 text-right">{st.accuracy}%</span>
      </div>
    </td>
    <td className="px-4 py-3 text-center text-xs text-gray-500">
      {st.lastActive ? new Date(st.lastActive).toLocaleDateString('kk-KZ') : '—'}
    </td>
  </motion.tr>
);

// ─── Class card ───────────────────────────────────────────────────────────────
const ClassStatCard = ({ cls, rank }: { cls: ClassStat; rank: number }) => {
  const [open, setOpen] = useState(false);
  const colors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4'];
  const col = colors[rank % colors.length];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.08 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Donut pct={cls.accuracy} color={col} size={64} />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-gray-700 dark:text-gray-200">
                {cls.accuracy}%
              </span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{cls.name}</h3>
              <p className="text-xs text-gray-400">{cls.description}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{cls.memberCount} оқушы</span>
                <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />{cls.totalTasks} тапсырма</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <MedalBadge rank={rank + 1} />
          </div>
        </div>

        <div className="space-y-2">
          <HBar value={cls.accuracy} max={100} color={
            cls.accuracy >= 70 ? 'bg-green-500' : cls.accuracy >= 40 ? 'bg-yellow-500' : 'bg-red-400'
          } label="Дәлдік" />
          <div className="flex justify-between text-xs text-gray-500 pt-1">
            <span>Дұрыс: <b className="text-gray-700 dark:text-gray-200">{cls.correctTasks}</b></span>
            <span>Барлығы: <b className="text-gray-700 dark:text-gray-200">{cls.totalTasks}</b></span>
            <span>Орт. балл: <b className="text-gray-700 dark:text-gray-200">{cls.avgScore}</b></span>
          </div>
        </div>
      </div>

      {cls.students.length > 0 && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => setOpen(!open)}
            className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            Оқушылар нәтижесі
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {open && (
            <div className="px-5 pb-4 space-y-2">
              {cls.students.map((st, i) => (
                <div key={st.id} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="font-semibold text-gray-700 dark:text-gray-200">{st.first_name} {st.last_name}</span>
                      <span className="text-gray-400">{st.totalTasks} тапс.</span>
                    </div>
                    <HBar value={st.accuracy} max={100}
                      color={st.accuracy >= 70 ? 'bg-green-400' : st.accuracy >= 40 ? 'bg-yellow-400' : 'bg-red-400'}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

// ─── Weekly activity chart ─────────────────────────────────────────────────────
const WeeklyChart = ({ data }: { data: { date: string; count: number }[] }) => {
  const max = Math.max(...data.map(d => d.count), 1);
  const days = ['Дс', 'Сс', 'Ср', 'Бс', 'Жм', 'Сн', 'Жс'];
  return (
    <div className="flex items-end gap-2 h-24">
      {data.map((d, i) => {
        const pct = (d.count / max) * 100;
        const dayOfWeek = new Date(d.date).getDay();
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(pct, 4)}%` }}
              transition={{ duration: 0.6, delay: i * 0.07 }}
              className={`w-full rounded-t-md ${d.count > 0 ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}
              title={`${d.count} тапсырма`}
            />
            <span className="text-xs text-gray-400">{days[dayOfWeek] || ''}</span>
          </div>
        );
      })}
    </div>
  );
};

// ─── Main Analytics page ──────────────────────────────────────────────────────
type Tab = 'overview' | 'classes' | 'students' | 'charts';

export const Analytics = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [sortKey, setSortKey] = useState<'accuracy' | 'totalTasks' | 'correctTasks'>('accuracy');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  useEffect(() => {
    fetchAnalytics()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLayout><div className="flex justify-center py-24"><LoadingSpinner /></div></PageLayout>;
  if (error)   return <PageLayout><div className="text-center py-24 text-red-500">{error}</div></PageLayout>;
  if (!data)   return null;

  const sortedStudents = [...data.allStudents].sort((a, b) =>
    (b[sortKey] - a[sortKey]) * sortDir
  );

  const sortedClasses = [...data.classes].sort((a, b) => b.accuracy - a.accuracy);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === -1 ? 1 : -1);
    else { setSortKey(key); setSortDir(-1); }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview',  label: 'Шолу',         icon: <BarChart2 className="w-4 h-4" /> },
    { key: 'classes',   label: 'Топтар',        icon: <GraduationCap className="w-4 h-4" /> },
    { key: 'students',  label: 'Оқушылар',      icon: <Users className="w-4 h-4" /> },
    { key: 'charts',    label: 'Диаграммалар',  icon: <TrendingUp className="w-4 h-4" /> },
  ];

  return (
    <PageLayout maxWidth="xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-blue-600" />
          Оқу аналитикасы
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Топтар мен оқушылардың үлгерімін бақылаңыз
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-8 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.key
                ? 'bg-white dark:bg-gray-700 text-blue-600 shadow'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="space-y-8">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<GraduationCap className="w-6 h-6 text-blue-600" />}
              label="Оқу топтары" value={data.totalClasses}
              color="bg-blue-50 dark:bg-blue-900/30" />
            <StatCard icon={<Users className="w-6 h-6 text-purple-600" />}
              label="Оқушылар" value={data.totalStudents}
              color="bg-purple-50 dark:bg-purple-900/30" />
            <StatCard icon={<BookOpen className="w-6 h-6 text-green-600" />}
              label="Орындалған тапсырмалар" value={data.totalTasksCompleted}
              color="bg-green-50 dark:bg-green-900/30" />
            <StatCard icon={<Target className="w-6 h-6 text-orange-600" />}
              label="Жалпы дәлдік" value={data.overallAccuracy} suffix="%"
              color="bg-orange-50 dark:bg-orange-900/30" />
          </div>

          {/* Top 3 podium */}
          {sortedStudents.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <Medal className="w-5 h-5 text-yellow-500" />
                Үздік оқушылар
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {sortedStudents.slice(0, 3).map((st, i) => (
                  <motion.div key={st.id}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow border text-center
                      ${i === 0 ? 'border-yellow-300 dark:border-yellow-600 ring-2 ring-yellow-200 dark:ring-yellow-900/50' :
                        i === 1 ? 'border-gray-200 dark:border-gray-600' : 'border-orange-200 dark:border-orange-800'}`}
                  >
                    <div className="text-3xl mb-2">{['🥇','🥈','🥉'][i]}</div>
                    <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-3">
                      <User className="w-7 h-7 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{st.first_name} {st.last_name}</h3>
                    <div className="flex flex-wrap justify-center gap-1 my-2">
                      {st.classNames.map(cn => (
                        <span key={cn} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">{cn}</span>
                      ))}
                    </div>
                    <div className="flex justify-around text-sm mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <div>
                        <div className="font-black text-gray-900 dark:text-white">{st.accuracy}%</div>
                        <div className="text-xs text-gray-400">Дәлдік</div>
                      </div>
                      <div>
                        <div className="font-black text-gray-900 dark:text-white">{st.totalTasks}</div>
                        <div className="text-xs text-gray-400">Тапсырма</div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Class comparison */}
          {sortedClasses.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-500" />
                Топтар салыстыруы
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow border border-gray-100 dark:border-gray-700">
                <div className="space-y-4">
                  {sortedClasses.map((cls, i) => {
                    const colors = ['bg-blue-500','bg-purple-500','bg-green-500','bg-yellow-500'];
                    return (
                      <div key={cls.id} className="flex items-center gap-4">
                        <div className="flex items-center gap-2 w-36 shrink-0">
                          <MedalBadge rank={i + 1} />
                          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{cls.name}</span>
                        </div>
                        <div className="flex-1">
                          <HBar value={cls.accuracy} max={100} color={colors[i % colors.length]} />
                        </div>
                        <div className="text-xs text-gray-400 w-20 text-right shrink-0">
                          {cls.memberCount} оқушы · {cls.totalTasks} тапс.
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Weekly activity */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-500" />
              Апталық белсенділік
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow border border-gray-100 dark:border-gray-700">
              <WeeklyChart data={data.weeklyActivity} />
              <p className="text-xs text-gray-400 mt-3 text-center">Соңғы 7 күн ішіндегі орындалған тапсырмалар</p>
            </div>
          </div>
        </div>
      )}

      {/* ── CLASSES ── */}
      {tab === 'classes' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Топтар рейтингі
            </h2>
            <span className="text-sm text-gray-400">{data.classes.length} топ</span>
          </div>
          {sortedClasses.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
              <GraduationCap className="w-14 h-14 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Топтар жоқ</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sortedClasses.map((cls, i) => (
                <ClassStatCard key={cls.id} cls={cls} rank={i} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STUDENTS ── */}
      {tab === 'students' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Оқушылар рейтингі
            </h2>
            <span className="text-sm text-gray-400">{data.allStudents.length} оқушы</span>
          </div>
          {sortedStudents.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
              <Users className="w-14 h-14 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Оқушылар жоқ</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs font-bold text-gray-500 uppercase">
                    <th className="px-4 py-3 text-left w-12">#</th>
                    <th className="px-4 py-3 text-left">Оқушы</th>
                    <th className="px-4 py-3 text-left">Топ</th>
                    <th className="px-4 py-3 text-center cursor-pointer hover:text-blue-500"
                      onClick={() => toggleSort('totalTasks')}>
                      Барлығы {sortKey === 'totalTasks' && (sortDir === -1 ? '↓' : '↑')}
                    </th>
                    <th className="px-4 py-3 text-center cursor-pointer hover:text-blue-500"
                      onClick={() => toggleSort('correctTasks')}>
                      Дұрыс {sortKey === 'correctTasks' && (sortDir === -1 ? '↓' : '↑')}
                    </th>
                    <th className="px-4 py-3 cursor-pointer hover:text-blue-500"
                      onClick={() => toggleSort('accuracy')}>
                      Дәлдік {sortKey === 'accuracy' && (sortDir === -1 ? '↓' : '↑')}
                    </th>
                    <th className="px-4 py-3 text-center">Соңғы белсенділік</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map((st, i) => (
                    <StudentRow key={st.id} st={st} rank={i + 1} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── CHARTS ── */}
      {tab === 'charts' && (
        <div className="space-y-8">
          {/* Class accuracy bar chart */}
          {data.classes.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow border border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-500" />
                Топтар бойынша дәлдік
              </h3>
              <BarChart
                data={data.classes.map(c => ({ label: c.name, value: c.accuracy }))}
                color="#3b82f6"
              />
            </div>
          )}

          {/* Donut charts per class */}
          {data.classes.length > 0 && (
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-500" />
                Орындау үлесі
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {data.classes.map((cls, i) => {
                  const colors = ['#3b82f6','#8b5cf6','#10b981','#f59e0b'];
                  return (
                    <div key={cls.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-2">
                      <div className="relative">
                        <Donut pct={cls.accuracy} color={colors[i % colors.length]} size={88} />
                        <span className="absolute inset-0 flex items-center justify-center text-base font-black text-gray-700 dark:text-gray-200">
                          {cls.accuracy}%
                        </span>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{cls.name}</div>
                        <div className="text-xs text-gray-400">{cls.memberCount} оқушы</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Difficulty breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow border border-gray-100 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              Қиындық деңгейі бойынша
            </h3>
            <div className="space-y-4">
              {data.difficultyStats.map(d => {
                const acc = d.total ? Math.round((d.correct / d.total) * 100) : 0;
                const cfg: Record<string, { label: string; color: string }> = {
                  easy:   { label: '🟢 Оңай',   color: 'bg-green-500' },
                  medium: { label: '🟡 Орташа',  color: 'bg-yellow-500' },
                  hard:   { label: '🔴 Қиын',    color: 'bg-red-500' }
                };
                return (
                  <div key={d.difficulty} className="flex items-center gap-4">
                    <span className="w-24 text-sm font-semibold text-gray-600 dark:text-gray-300 shrink-0">
                      {cfg[d.difficulty]?.label}
                    </span>
                    <div className="flex-1">
                      <HBar value={acc} max={100} color={cfg[d.difficulty]?.color} />
                    </div>
                    <span className="text-xs text-gray-400 w-24 text-right shrink-0">
                      {d.correct}/{d.total} дұрыс
                    </span>
                  </div>
                );
              })}
              {data.difficultyStats.every(d => d.total === 0) && (
                <div className="text-center py-6 text-gray-400 text-sm">Мәлімет жоқ</div>
              )}
            </div>
          </div>

          {/* Top topics */}
          {data.topTopics.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow border border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-green-500" />
                Тақырыптар бойынша белсенділік
              </h3>
              <BarChart
                data={data.topTopics.map(t => ({
                  label: t.topic,
                  value: t.total ? Math.round((t.correct / t.total) * 100) : 0
                }))}
                color="#10b981"
              />
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
};

export default Analytics;
