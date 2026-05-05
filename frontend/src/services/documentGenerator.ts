// src/services/documentGenerator.ts

// ---------- PDF (БРАУЗЕР) ----------
import { jsPDF } from 'jspdf';
import katex from 'katex';
import { toPng } from 'html-to-image';

// Твой тип задачи
import type { Question } from '@/types/exam';

export interface DocumentOptions {
  includeSolutions: boolean;
  includeAnswers: boolean;
  includeAnswerSpaces?: boolean;
}

type Token =
  | { type: 'text'; text: string }
  | { type: 'image'; dataUrl: string; display: boolean };

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

// ---------- УТИЛИТЫ ----------

/** Нормализуем \(...\), \[...\], $$..$$ в вид, который стабильно ест Pandoc */
const normalizeMathForPandoc = (s: string) =>
  s
    .replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$') // \(..\) -> $..$
    .replace(/\\\[([\s\S]*?)\\\]/g, '$$$$\n$1\n$$$$'); // \[..\] -> $$..$$

/** KaTeX (HTML) → PNG dataURL (для jsPDF). Только в браузере. */
async function renderLatexToPngDataUrl(latex: string, displayMode = false): Promise<string> {
  if (!isBrowser) {
    throw new Error('renderLatexToPngDataUrl должен вызываться в браузере');
  }

  const html = katex.renderToString(latex, {
    output: 'html', // допустимые значения типов у KaTeX: 'html' | 'mathml' | 'htmlAndMathml'
    displayMode,
    throwOnError: false,
    strict: 'warn',
    trust: true,
  });

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-100000px';
  container.style.top = '-100000px';
  container.style.backgroundColor = '#ffffff';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const dataUrl = await toPng(container, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
    });
    return dataUrl;
  } finally {
    document.body.removeChild(container);
  }
}

/** Разбиваем текст на последовательность токенов: обычный текст и PNG-формулы */
async function tokenizeRichMath(text: string): Promise<Token[]> {
  if (!isBrowser) {
    // В серверном окружении вернём просто текст (PDF не генерим на сервере)
    return [{ type: 'text', text }];
  }

  // Поддержим $$..$$ как эквивалент \[..\]
  let src = text.replace(/\$\$([\s\S]*?)\$\$/g, '\\[$1\\]');

  const blockRe = /\\\[([\s\S]*?)\\\]/g; // \[ .. \]
  const inlineRe = /\\\(([\s\S]*?)\\\)/g; // \( .. \)

  const out: Token[] = [];
  let cursor = 0;
  let m: RegExpExecArray | null;

  // Сначала вырезаем блоки \[...\]
  while ((m = blockRe.exec(src)) !== null) {
    const [full, body] = m;
    const start = m.index;
    if (start > cursor) {
      await pushInline(src.slice(cursor, start), out);
    }
    const dataUrl = await renderLatexToPngDataUrl(body, true);
    out.push({ type: 'image', dataUrl, display: true });
    cursor = start + full.length;
  }
  if (cursor < src.length) {
    await pushInline(src.slice(cursor), out);
  }

  return out;

  async function pushInline(segment: string, acc: Token[]) {
    let c = 0, mm: RegExpExecArray | null;
    while ((mm = inlineRe.exec(segment)) !== null) {
      const [fu, body] = mm;
      const st = mm.index;
      if (st > c) acc.push({ type: 'text', text: segment.slice(c, st) });
      const dataUrl = await renderLatexToPngDataUrl(body, false);
      acc.push({ type: 'image', dataUrl, display: false });
      c = st + fu.length;
    }
    if (c < segment.length) acc.push({ type: 'text', text: segment.slice(c) });
  }
}

// Простые настройки места для ответов (как у тебя)
const taskTypeConfigs: Record<
  string,
  { answerSpacing: number; includeAnswerBox: boolean; answerFormat?: string }
> = {
  Essay: { answerSpacing: 100, includeAnswerBox: true, answerFormat: 'Write your essay here (minimum 300 words):' },
  'Short Answer': { answerSpacing: 40, includeAnswerBox: true, answerFormat: 'Answer:' },
  'Problem Solving': { answerSpacing: 60, includeAnswerBox: true, answerFormat: 'Show your work:' },
  Coding: { answerSpacing: 80, includeAnswerBox: true, answerFormat: 'Write your code here:' },
  'Case Study': { answerSpacing: 80, includeAnswerBox: true, answerFormat: 'Analysis:' },
  'Data Analysis': { answerSpacing: 60, includeAnswerBox: true, answerFormat: 'Analysis and Findings:' },
  'Multiple Choice': { answerSpacing: 10, includeAnswerBox: false },
  'True/False': { answerSpacing: 10, includeAnswerBox: false },
  'Fill in the Blank': { answerSpacing: 20, includeAnswerBox: true },
  Matching: { answerSpacing: 30, includeAnswerBox: true },
};

// ---------- PDF: ГЕНЕРАЦИЯ (браузер, jsPDF + KaTeX PNG) ----------
export async function generatePDF(
  tasks: Question[],
  options: DocumentOptions,
  title: string = 'Task Sheet'
): Promise<Blob> {
  if (!isBrowser) {
    throw new Error('generatePDF рассчитан на браузер (использует canvas/html-to-image).');
  }

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let y = 48;
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;

  const ensureSpace = (need: number) => {
    if (y + need > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Заголовок
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  y += 28;

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const cfg = taskTypeConfigs[t.type] ?? { answerSpacing: 20, includeAnswerBox: false };

    // Текст задания + формулы
    const linePrefix = `${i + 1}. `;
    const tokens = await tokenizeRichMath(linePrefix + (t.text ?? ''));

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);

    let x = margin;
    for (const token of tokens) {
      if (token.type === 'text') {
        const lines = doc.splitTextToSize(token.text, maxWidth - (x - margin));
        for (const ln of lines) {
          ensureSpace(16);
          doc.text(ln, x, y);
          y += 16;
          x = margin;
        }
      } else {
        // картинка с формулой
        // @ts-ignore — тип у jsPDF не всегда содержит getImageProperties
        const imgProps = (doc as any).getImageProperties(token.dataUrl);
        const scale = Math.min(1, maxWidth / imgProps.width);
        const w = imgProps.width * scale;
        const h = imgProps.height * scale;
        ensureSpace(h + 6);
        doc.addImage(token.dataUrl, 'PNG', margin, y, w, h);
        y += h + 6;
        x = margin;
      }
    }


    // Места для ответов (сохранена твоя логика в упрощённом виде)
    if (options.includeAnswerSpaces && t.type.toLowerCase() !== 'multiple choice') {
      ensureSpace(10);
      if (cfg.answerFormat) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(cfg.answerFormat, maxWidth);
        for (const ln of lines) {
          ensureSpace(12);
          doc.text(ln, margin, y);
          y += 12;
        }
      }

      doc.setDrawColor(120);
      doc.setLineWidth(0.7);

      switch (t.type.toLowerCase()) {
        case 'true-false': {
          ensureSpace(24);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(11);
          doc.rect(margin, y - 10, 12, 12);
          doc.text('True', margin + 20, y);
          doc.rect(margin + 80, y - 10, 12, 12);
          doc.text('False', margin + 100, y);
          y += 26;
          break;
        }
        case 'essay': {
          const h = 150;
          ensureSpace(h + 10);
          doc.rect(margin, y, maxWidth, h);
          y += h + 12;
          break;
        }
        case 'calculation': {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(10);
          ensureSpace(12);
          doc.text('Work space:', margin, y);
          y += 12;

          const h = 100;
          ensureSpace(h + 14);
          doc.rect(margin, y, maxWidth, h);
          y += h + 14;

          doc.setFont('helvetica', 'normal');
          ensureSpace(14);
          doc.text('Final answer:', margin, y);
          doc.line(margin + 60, y, margin + maxWidth, y);
          y += 22;
          break;
        }
        case 'matching': {
          ensureSpace(24);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          for (let k = 0; k < 4; k++) {
            const bx = margin + k * (maxWidth / 4);
            doc.text(`${k + 1}.`, bx, y);
            doc.rect(bx + 14, y - 10, 28, 14);
          }
          y += 24;
          break;
        }
        default: {
          if (cfg.answerSpacing >= 60) {
            ensureSpace(cfg.answerSpacing + 10);
            doc.rect(margin, y, maxWidth, cfg.answerSpacing);
            y += cfg.answerSpacing + 12;
          } else {
            ensureSpace(50);
            doc.text('Answer:', margin, y);
            doc.line(margin + 42, y, margin + maxWidth, y);
            doc.line(margin, y + 16, margin + maxWidth, y + 16);
            doc.line(margin, y + 32, margin + maxWidth, y + 32);
            y += 50;
          }
          break;
        }
      }
    }

    y += 10;
  }

  // Раздел решений/ответов
  if (options.includeSolutions || options.includeAnswers) {
    doc.addPage();
    y = margin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Solutions and Answers', pageWidth / 2, y, { align: 'center' });
    y += 20;

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      ensureSpace(16);
      doc.text(`Task ${i + 1}:`, margin, y);
      y += 14;

      // Краткий текст
      if (t.text) {
        const preview = t.text.length > 180 ? t.text.slice(0, 180) + '…' : t.text;
        const toks = await tokenizeRichMath(preview);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        for (const tok of toks) {
          if (tok.type === 'text') {
            const lines = doc.splitTextToSize(tok.text, maxWidth);
            for (const ln of lines) {
              ensureSpace(12);
              doc.text(ln, margin, y);
              y += 12;
            }
          } else {
            // @ts-ignore
            const imgProps = (doc as any).getImageProperties(tok.dataUrl);
            const scale = Math.min(1, maxWidth / imgProps.width);
            const w = imgProps.width * scale;
            const h = imgProps.height * scale;
            ensureSpace(h + 6);
            doc.addImage(tok.dataUrl, 'PNG', margin, y, w, h);
            y += h + 6;
          }
        }
      }

      if (options.includeSolutions && t.solution) {
        ensureSpace(14);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Solution:', margin, y);
        y += 12;

        const toks = await tokenizeRichMath(t.solution);
        doc.setFont('helvetica', 'normal');
        for (const tok of toks) {
          if (tok.type === 'text') {
            const lines = doc.splitTextToSize(tok.text, maxWidth);
            for (const ln of lines) {
              ensureSpace(12);
              doc.text(ln, margin, y);
              y += 12;
            }
          } else {
            // @ts-ignore
            const imgProps = (doc as any).getImageProperties(tok.dataUrl);
            const scale = Math.min(1, maxWidth / imgProps.width);
            const w = imgProps.width * scale;
            const h = imgProps.height * scale;
            ensureSpace(h + 6);
            doc.addImage(tok.dataUrl, 'PNG', margin, y, w, h);
            y += h + 6;
          }
        }
      }

      if (options.includeAnswers && t.answer) {
        ensureSpace(14);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Answer:', margin, y);
        y += 12;

        const toks = await tokenizeRichMath(t.answer);
        doc.setFont('helvetica', 'normal');
        for (const tok of toks) {
          if (tok.type === 'text') {
            const lines = doc.splitTextToSize(tok.text, maxWidth);
            for (const ln of lines) {
              ensureSpace(12);
              doc.text(ln, margin, y);
              y += 12;
            }
          } else {
            // @ts-ignore
            const imgProps = (doc as any).getImageProperties(tok.dataUrl);
            const scale = Math.min(1, maxWidth / imgProps.width);
            const w = imgProps.width * scale;
            const h = imgProps.height * scale;
            ensureSpace(h + 6);
            doc.addImage(tok.dataUrl, 'PNG', margin, y, w, h);
            y += h + 6;
          }
        }
      }

      y += 10;
    }
  }

  return doc.output('blob');
}

// ---------- DOCX (СЕРВЕР/Node) / или запрос к серверу из браузера ----------

/** Сборка Markdown из массива задач (ничего не вырезаем — LaTeX остаётся как есть) */
function tasksToMarkdown(tasks: Question[], options: DocumentOptions, title = 'Task Sheet'): string {
  const lines: string[] = [];
  lines.push(`# ${title}`, '');

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    lines.push(`${i + 1}) ${t.text ?? ''}`);
    lines.push('');
  }

  if (options.includeSolutions || options.includeAnswers) {
    lines.push(`\\newpage`, `# Solutions and Answers`, '');
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      lines.push(`## Task ${i + 1}`, '');
      const preview = (t.text ?? '').slice(0, 220);
      if (preview) lines.push(preview, '');
      if (options.includeSolutions && t.solution) {
        lines.push(`**Solution.**`, '');
        lines.push(t.solution, '');
      }
      if (options.includeAnswers && t.answer) {
        lines.push(`**Answer.**`, '');
        lines.push(t.answer, '');
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/** Buffer → ArrayBuffer (для корректного Blob в среде Node)
 * Примечание: избегаем ссылки на тип Buffer, чтобы не требовать @types/node в браузерной сборке
 */
function bufferToArrayBuffer(buf: any): ArrayBuffer {
  const ab = new ArrayBuffer(buf.byteLength);
  const view = new Uint8Array(ab);
  view.set(buf);
  return ab;
}

/**
 * Универсальная функция: в браузере пошлёт POST /api/export с format:'docx' и получит blob;
 * на сервере (isBrowser===false) выполнит локальную генерацию через Pandoc (как раньше).
 */
export async function generateDOCXWithPandoc(
  tasks: Question[],
  options: DocumentOptions,
  title = 'Task Sheet'
): Promise<Blob> {
  if (isBrowser) {
    // Отправляем на серверный endpoint (валидный для того server, который мы создавали)
    const payload = { tasks, options, title, format: 'docx' };
    const resp = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // credentials: 'same-origin' // при необходимости включите
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw new Error(`Export failed: ${resp.status} ${resp.statusText} ${txt}`);
    }

    const blob = await resp.blob();
    // тип должен быть set сервером; если нет — force:
    // return new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    return blob;
  }

  // ----------------- РАНЬШЕШНЯЯ СЕРВЕРНАЯ ЛОГИКА (Node) -----------------
  // Если мы вызваны из Node (например, при серверной сборке), оставляем оригинальную реализацию
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execFileAsync = promisify(execFile);
  const { writeFile, readFile, unlink } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');

  const mdRaw = tasksToMarkdown(tasks, options, title);
  const md = normalizeMathForPandoc(mdRaw);

  const tmpMd = join(tmpdir(), `tasks_${Date.now()}_${Math.random().toString(36).slice(2)}.md`);
  const tmpDocx = join(tmpdir(), `tasks_${Date.now()}_${Math.random().toString(36).slice(2)}.docx`);

  await writeFile(tmpMd, md, 'utf8');

  try {
    await execFileAsync('pandoc', [
      '-f',
      'markdown+tex_math_dollars+tex_math_single_backslash',
      '-t',
      'docx',
      tmpMd,
      '-o',
      tmpDocx,
      // '--reference-doc=reference.docx', // при желании можно добавить шаблон Word
    ]);

    const buf = (await readFile(tmpDocx)) as unknown as Buffer;
    const ab: ArrayBuffer = bufferToArrayBuffer(buf);

    return new Blob([ab], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  } finally {
    try {
      await unlink(tmpMd);
    } catch {}
    try {
      await unlink(tmpDocx);
    } catch {}
  }
}

// ---------- Универсальная загрузка из браузера ----------
export async function downloadDocument(
  tasks: Question[],
  format: 'pdf' | 'docx' = 'pdf',
  options: DocumentOptions,
  title: string = 'Task Sheet'
): Promise<void> {
  let blob: Blob;

  if (format === 'pdf') {
    // PDF генерируется в браузере (текущая реализация использует KaTeX->PNG)
    blob = await generatePDF(tasks, options, title);
  } else {
    // DOCX: в браузере — вызываем серверный endpoint; в Node — локально через Pandoc
    blob = await generateDOCXWithPandoc(tasks, options, title);
  }

  if (!isBrowser) {
    // На сервере мы не занимаемся скачиванием — можно вернуть blob или Buffer напрямую
    return;
  }

  // Браузер: скачать
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}.${format}`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
