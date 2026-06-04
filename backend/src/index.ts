// server/src/index.ts
// Load environment variables from .env file FIRST
import dotenv from 'dotenv';
import { resolve } from 'node:path';

dotenv.config({ path: resolve(process.cwd(), '.env') });
console.log('Dotenv configured');

import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeFile, readFile, unlink } from 'node:fs/promises';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
const execFileAsync = promisify(execFile);

console.log('Modules imported');

// Initialize OpenAI client with API key from environment variable
// Only initialize if API key is present to avoid errors
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

console.log('OpenAI initialized:', !!openai);

if (!process.env.OPENAI_API_KEY) {
  console.warn('WARNING: OPENAI_API_KEY environment variable is not set. OpenAI features will not work.');
}

type Question = {
  text?: string;
  context?: string;
  instructions?: string;
  type?: string;
  answers?: string[];
  solution?: string;
  learningOutcome?: string;
};

type DocumentOptions = {
  includeSolutions?: boolean;
  includeAnswers?: boolean;
  includeAnswerSpaces?: boolean;
  includeInstructions?: boolean;
  includeContext?: boolean;
  includeLearningOutcomes?: boolean;
};

function normalizeMathForPandoc(s: string) {
  return s
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$')
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$\n$1\n$$$$');
}

function tasksToMarkdown(tasks: Question[], opts: DocumentOptions = {}, title = 'Task Sheet') {
  const lines: string[] = [];
  lines.push(`# ${title}`, '');
  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    lines.push(`${i + 1}) ${t.text ?? ''}`);
    if (opts.includeContext && t.context) lines.push(`*Context:* ${t.context}`);
    if (opts.includeInstructions && t.instructions) lines.push(`*Instructions:* ${t.instructions}`);
    if (opts.includeLearningOutcomes && t.learningOutcome) lines.push(`*Learning outcome:* ${t.learningOutcome}`);
    lines.push('');
  }

  if (opts.includeSolutions || opts.includeAnswers) {
    lines.push('\\newpage', '# Solutions and Answers', '');
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      lines.push(`## Task ${i + 1}`, '');
      if (opts.includeSolutions && t.solution) {
        lines.push('**Solution.**', '', t.solution || '', '');
      }
    }
  }
  return lines.join('\n');
}

const app = express();

// Enable CORS for frontend requests
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// ─── Analytics endpoint (service-role bypass for RLS) ──────────────────────
app.get('/analytics', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });

    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Supabase not configured' });

    // Verify user via their JWT token using service role client
    const sb0 = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: { user }, error: authErr } = await sb0.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });

    // Service-role client — bypasses RLS
    const sb = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const teacherId = user.id;

    // 1. Teacher's classes
    const { data: classes } = await sb.from('classes').select('*').eq('teacher_id', teacherId).order('created_at');

    // 2. Class members (raw)
    const classIds = (classes || []).map((c: any) => c.id);
    const { data: rawMembers } = classIds.length
      ? await sb.from('class_members').select('class_id, student_id').in('class_id', classIds)
      : { data: [] };

    const studentIds = [...new Set((rawMembers || []).map((m: any) => m.student_id))];

    // 3. Profiles
    const { data: profiles } = studentIds.length
      ? await sb.from('profiles').select('id, first_name, last_name, email, avatar_url').in('id', studentIds)
      : { data: [] };
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    // 4. Submissions for ALL students in teacher's classes
    const { data: submissions } = studentIds.length
      ? await sb.from('task_submissions').select('*').in('user_id', studentIds)
      : { data: [] };

    // 5. Sheet submissions
    const { data: sheetSubs } = studentIds.length
      ? await sb.from('sheet_submissions').select('*').in('user_id', studentIds)
      : { data: [] };

    // 6. Assignments
    const { data: assignments } = await sb.from('task_assignments').select('*').eq('teacher_id', teacherId);

    // ─── Build student stats ────────────────────────────────────────────────
    const studentMap = new Map<string, any>();

    for (const m of (rawMembers || [])) {
      const p = profileMap.get(m.student_id);
      if (!p) continue;
      if (!studentMap.has(p.id)) {
        const cls = (classes || []).find((c: any) => c.id === m.class_id);
        studentMap.set(p.id, {
          id: p.id, first_name: p.first_name, last_name: p.last_name,
          email: p.email, avatar_url: p.avatar_url,
          classNames: [], totalTasks: 0, correctTasks: 0,
          accuracy: 0, avgScore: 0, totalTimeSpent: 0,
          topicBreakdown: {}, difficultyBreakdown: {}, lastActive: null
        });
      }
      const st = studentMap.get(p.id);
      const cls = (classes || []).find((c: any) => c.id === m.class_id);
      if (cls && !st.classNames.includes(cls.name)) st.classNames.push(cls.name);
    }

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

    for (const st of studentMap.values()) {
      st.accuracy = st.totalTasks ? Math.round((st.correctTasks / st.totalTasks) * 100) : 0;
      const scores = (submissions || []).filter((s: any) => s.user_id === st.id).map((s: any) => s.score || 0);
      st.avgScore = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;
    }

    const allStudents = [...studentMap.values()].sort((a, b) => b.accuracy - a.accuracy || b.totalTasks - a.totalTasks);

    // ─── Class stats ────────────────────────────────────────────────────────
    const classStats = (classes || []).map((cls: any) => {
      const clsMembers = (rawMembers || [])
        .filter((m: any) => m.class_id === cls.id)
        .map((m: any) => studentMap.get(m.student_id))
        .filter(Boolean);
      const clsStudents = clsMembers.sort((a: any, b: any) => b.accuracy - a.accuracy);
      const totalTasks   = clsStudents.reduce((s: number, st: any) => s + st.totalTasks, 0);
      const correctTasks = clsStudents.reduce((s: number, st: any) => s + st.correctTasks, 0);
      const accuracy     = totalTasks ? Math.round((correctTasks / totalTasks) * 100) : 0;
      const avgScore     = clsStudents.length
        ? Math.round(clsStudents.reduce((s: number, st: any) => s + st.avgScore, 0) / clsStudents.length) : 0;
      return {
        id: cls.id, name: cls.name, description: cls.description,
        memberCount: clsMembers.length, students: clsStudents,
        totalTasks, correctTasks, accuracy, avgScore,
        assignedSheets: (assignments || []).filter((a: any) => a.class_id === cls.id).length,
        completedSheets: (sheetSubs || []).filter((s: any) => clsStudents.some((st: any) => st.id === s.user_id)).length
      };
    });

    // ─── Global topic / difficulty stats ───────────────────────────────────
    const topicMap: Record<string, any> = {};
    const diffMap:  Record<string, any> = {};
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
    const topTopics = Object.entries(topicMap).map(([topic, v]: any) => ({ topic, ...v })).sort((a: any, b: any) => b.total - a.total).slice(0, 8);
    const difficultyStats = ['easy', 'medium', 'hard'].map(d => ({ difficulty: d, correct: diffMap[d]?.correct || 0, total: diffMap[d]?.total || 0 }));

    // ─── Weekly activity ─────────────────────────────────────────────────────
    const weeklyMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now); day.setDate(day.getDate() - i);
      weeklyMap[day.toISOString().split('T')[0]] = 0;
    }
    for (const sub of (submissions || [])) {
      const day = sub.submitted_at?.split('T')[0];
      if (day && weeklyMap[day] !== undefined) weeklyMap[day]++;
    }
    const weeklyActivity = Object.entries(weeklyMap).map(([date, count]) => ({ date, count }));

    const totalTasksCompleted = allStudents.reduce((s, st) => s + st.totalTasks, 0);
    const overallAccuracy = totalTasksCompleted
      ? Math.round(allStudents.reduce((s, st) => s + st.correctTasks, 0) / totalTasksCompleted * 100) : 0;

    res.json({
      classes: classStats, allStudents,
      totalStudents: studentIds.length,
      totalClasses: (classes || []).length,
      totalTasksAssigned: (assignments || []).length,
      totalTasksCompleted, overallAccuracy,
      topTopics, difficultyStats, weeklyActivity
    });
  } catch (err: any) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: err?.message || 'Analytics failed' });
  }
});

app.post('/export', async (req, res) => {
  try {
    const { tasks, options, title = 'Task Sheet', format = 'docx' } = req.body as {
      tasks: Question[];
      options?: DocumentOptions;
      title?: string;
      format?: 'docx' | 'pdf';
    };

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'tasks must be a non-empty array' });
    }

    const mdRaw = tasksToMarkdown(tasks, options || {}, title);
    const md = normalizeMathForPandoc(mdRaw);

    const tmpMd = join(tmpdir(), `tasks_${Date.now()}.md`);
    const outFile = join(tmpdir(), `tasks_${Date.now()}.${format}`);

    await writeFile(tmpMd, md, 'utf8');

    const baseArgs = ['-f', 'markdown+tex_math_dollars+tex_math_single_backslash', tmpMd, '-o', outFile];
    if (format === 'pdf') baseArgs.push('--pdf-engine=xelatex');

    // безопасный вызов pandoc
    await execFileAsync('pandoc', baseArgs, { maxBuffer: 200 * 1024 * 1024, timeout: 2 * 60 * 1000 });

    const buf = await readFile(outFile);
    if (format === 'docx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}.docx"`);
    } else {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}.pdf"`);
    }

    res.send(buf);

    // cleanup
    await unlink(tmpMd).catch(() => {});
    await unlink(outFile).catch(() => {});
  } catch (err: any) {
    console.error('Export error:', err);
    res.status(500).json({ error: err?.message || 'export failed' });
  }
});

// OpenAI API proxy endpoint
app.post('/openai/chat', async (req, res) => {
  try {
    if (!openai || !process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable in .env file.' 
      });
    }

    const { messages, model = 'gpt-4o-mini', temperature, max_tokens } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages must be a non-empty array' });
    }

    const completion = await openai.chat.completions.create({
      model,
      messages,
      ...(temperature !== undefined && { temperature }),
      ...(max_tokens !== undefined && { max_tokens }),
    });

    res.json(completion);
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    
    // Handle OpenAI API errors
    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid OpenAI API key' });
    }
    if (error.status === 429) {
      return res.status(429).json({ error: 'OpenAI API rate limit exceeded' });
    }
    if (error.status === 500) {
      return res.status(502).json({ error: 'OpenAI API service error' });
    }

    res.status(500).json({ 
      error: error?.message || 'Failed to process OpenAI request' 
    });
  }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(PORT, () => {
  console.log(`Export server listening on http://localhost:${PORT}`);
});

export default app;

