import { supabase } from './supabase';

// Backend endpoint — bypasses RLS (service role on server)
const ANALYTICS_URL = '/api/analytics';

export type StudentStat = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string;
  classNames: string[];
  totalTasks: number;
  correctTasks: number;
  accuracy: number;
  avgScore: number;
  totalTimeSpent: number;
  topicBreakdown: Record<string, { correct: number; total: number }>;
  difficultyBreakdown: Record<string, { correct: number; total: number }>;
  lastActive: string | null;
};

export type ClassStat = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  students: StudentStat[];
  totalTasks: number;
  correctTasks: number;
  accuracy: number;
  avgScore: number;
  assignedSheets: number;
  completedSheets: number;
};

export type AnalyticsData = {
  classes: ClassStat[];
  allStudents: StudentStat[];
  totalStudents: number;
  totalClasses: number;
  totalTasksAssigned: number;
  totalTasksCompleted: number;
  overallAccuracy: number;
  topTopics: { topic: string; correct: number; total: number }[];
  difficultyStats: { difficulty: string; correct: number; total: number }[];
  weeklyActivity: { date: string; count: number }[];
};

export async function fetchAnalytics(): Promise<AnalyticsData> {
  // Get current session token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  // Call backend which uses service role to bypass RLS
  const resp = await fetch(ANALYTICS_URL, {
    headers: { Authorization: `Bearer ${session.access_token}` }
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || 'Analytics request failed');
  }
  return await resp.json();
}

// Legacy direct fetch (kept for reference, not used)
export async function fetchAnalyticsDirect(): Promise<AnalyticsData> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // 1. Teacher's classes
  const { data: classes } = await supabase
    .from('classes')
    .select('*')
    .eq('teacher_id', user.id)
    .order('created_at');

  // 2. All class members (raw)
  const classIds = (classes || []).map(c => c.id);
  const { data: rawMembers } = classIds.length
    ? await supabase
        .from('class_members')
        .select('class_id, student_id')
        .in('class_id', classIds)
    : { data: [] };

  // 3. All student IDs in teacher's classes
  const studentIds = [...new Set((rawMembers || []).map((m: any) => m.student_id))];

  // Fetch profiles separately for reliability
  const { data: profiles } = studentIds.length
    ? await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url')
        .in('id', studentIds)
    : { data: [] };

  const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  // Enrich members with profile data
  const members = (rawMembers || []).map((m: any) => ({
    ...m,
    profiles: profileMap.get(m.student_id) || null
  }));

  // 4. Task submissions for these students
  const { data: submissions } = studentIds.length
    ? await supabase
        .from('task_submissions')
        .select('*')
        .in('user_id', studentIds)
        .order('submitted_at', { ascending: false })
    : { data: [] };

  // 5. Sheet submissions
  const { data: sheetSubs } = studentIds.length
    ? await supabase
        .from('sheet_submissions')
        .select('*')
        .in('user_id', studentIds)
    : { data: [] };

  // 6. Task assignments for teacher
  const { data: assignments } = await supabase
    .from('task_assignments')
    .select('*')
    .eq('teacher_id', user.id);

  // ─── Build student stats ──────────────────────────────────────────────────
  const studentMap = new Map<string, StudentStat>();

  // Init from members
  for (const m of (members || [])) {
    const p = (m as any).profiles;
    if (!p) continue;
    if (!studentMap.has(p.id)) {
      studentMap.set(p.id, {
        id: p.id, first_name: p.first_name, last_name: p.last_name,
        email: p.email, avatar_url: p.avatar_url,
        classNames: [], totalTasks: 0, correctTasks: 0, accuracy: 0,
        avgScore: 0, totalTimeSpent: 0, topicBreakdown: {},
        difficultyBreakdown: {}, lastActive: null
      });
    }
    const cls = (classes || []).find(c => c.id === (m as any).class_id);
    if (cls) studentMap.get(p.id)!.classNames.push(cls.name);
  }

  // Aggregate submissions per student
  for (const sub of (submissions || [])) {
    const st = studentMap.get(sub.user_id);
    if (!st) continue;
    st.totalTasks++;
    if (sub.is_correct) st.correctTasks++;
    st.totalTimeSpent += sub.time_spent || 0;
    if (!st.lastActive || sub.submitted_at > st.lastActive) st.lastActive = sub.submitted_at;

    const t = sub.topic || 'Other';
    if (!st.topicBreakdown[t]) st.topicBreakdown[t] = { correct: 0, total: 0 };
    st.topicBreakdown[t].total++;
    if (sub.is_correct) st.topicBreakdown[t].correct++;

    const d = sub.difficulty || 'medium';
    if (!st.difficultyBreakdown[d]) st.difficultyBreakdown[d] = { correct: 0, total: 0 };
    st.difficultyBreakdown[d].total++;
    if (sub.is_correct) st.difficultyBreakdown[d].correct++;
  }

  // Finalize accuracy + avgScore
  for (const st of studentMap.values()) {
    st.accuracy = st.totalTasks ? Math.round((st.correctTasks / st.totalTasks) * 100) : 0;
    const scores = (submissions || [])
      .filter(s => s.user_id === st.id)
      .map(s => s.score || 0);
    st.avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }

  const allStudents = [...studentMap.values()]
    .sort((a, b) => b.accuracy - a.accuracy || b.totalTasks - a.totalTasks);

  // ─── Build class stats ────────────────────────────────────────────────────
  const classStats: ClassStat[] = (classes || []).map(cls => {
    const clsMembers = (members || [])
      .filter((m: any) => m.class_id === cls.id)
      .map((m: any) => studentMap.get(m.student_id))
      .filter(Boolean) as StudentStat[];

    const clsStudents = clsMembers.sort((a, b) => b.accuracy - a.accuracy);
    const totalTasks   = clsStudents.reduce((s, st) => s + st.totalTasks, 0);
    const correctTasks = clsStudents.reduce((s, st) => s + st.correctTasks, 0);
    const accuracy     = totalTasks ? Math.round((correctTasks / totalTasks) * 100) : 0;
    const avgScore     = clsStudents.length
      ? Math.round(clsStudents.reduce((s, st) => s + st.avgScore, 0) / clsStudents.length) : 0;

    const assignedSheets = (assignments || [])
      .filter(a => a.class_id === cls.id).length;
    const completedSheets = (sheetSubs || [])
      .filter(s => clsStudents.some(st => st.id === s.user_id)).length;

    return {
      id: cls.id, name: cls.name, description: cls.description,
      memberCount: clsMembers.length, students: clsStudents,
      totalTasks, correctTasks, accuracy, avgScore,
      assignedSheets, completedSheets
    };
  });

  // ─── Global topic stats ───────────────────────────────────────────────────
  const topicMap: Record<string, { correct: number; total: number }> = {};
  const diffMap:  Record<string, { correct: number; total: number }> = {};
  for (const sub of (submissions || [])) {
    const t = sub.topic || 'Other';
    if (!topicMap[t]) topicMap[t] = { correct: 0, total: 0 };
    topicMap[t].total++;
    if (sub.is_correct) topicMap[t].correct++;

    const d = sub.difficulty || 'medium';
    if (!diffMap[d]) diffMap[d] = { correct: 0, total: 0 };
    diffMap[d].total++;
    if (sub.is_correct) diffMap[d].correct++;
  }
  const topTopics = Object.entries(topicMap)
    .map(([topic, v]) => ({ topic, ...v }))
    .sort((a, b) => b.total - a.total).slice(0, 8);

  const difficultyStats = ['easy', 'medium', 'hard'].map(d => ({
    difficulty: d,
    correct: diffMap[d]?.correct || 0,
    total: diffMap[d]?.total || 0
  }));

  // ─── Weekly activity ──────────────────────────────────────────────────────
  const weeklyMap: Record<string, number> = {};
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    weeklyMap[d.toISOString().split('T')[0]] = 0;
  }
  for (const sub of (submissions || [])) {
    const day = sub.submitted_at?.split('T')[0];
    if (day && weeklyMap[day] !== undefined) weeklyMap[day]++;
  }
  const weeklyActivity = Object.entries(weeklyMap).map(([date, count]) => ({ date, count }));

  const totalTasksCompleted = allStudents.reduce((s, st) => s + st.totalTasks, 0);
  const overallAccuracy = totalTasksCompleted
    ? Math.round(allStudents.reduce((s, st) => s + st.correctTasks, 0) / totalTasksCompleted * 100) : 0;

  return {
    classes: classStats, allStudents,
    totalStudents: studentIds.length,
    totalClasses: (classes || []).length,
    totalTasksAssigned: (assignments || []).length,
    totalTasksCompleted, overallAccuracy,
    topTopics, difficultyStats, weeklyActivity
  };
}
