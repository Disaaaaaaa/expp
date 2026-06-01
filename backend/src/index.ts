// server/src/index.ts
// Load environment variables from .env file FIRST
import dotenv from 'dotenv';
import { resolve } from 'node:path';

// Load .env file from server directory
// process.cwd() returns the directory where the command was run (server/)
dotenv.config({ path: resolve(process.cwd(), '.env') });
console.log('Dotenv configured');

import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
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

