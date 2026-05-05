import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export const formatMathText = (text: string) => {
  if (!text) return '';

  
  const parts = text.split(/(\\\[.*?\\\]|\\\(.*?\\\))/gs);
  
  return parts.map((part, index) => {
    
    if (part.startsWith('\\[') && part.endsWith('\\]')) {
      const math = part.slice(2, -2).trim();
      return (
        <div key={index} className="my-2 overflow-x-auto max-w-full">
          <div className="inline-block min-w-0">
            <BlockMath math={math} />
          </div>
        </div>
      );
    }
    
    else if (part.startsWith('\\(') && part.endsWith('\\)')) {
      const math = part.slice(2, -2).trim();
      return (
        <span key={index} className="inline-block max-w-full overflow-x-auto">
          <InlineMath math={math} />
        </span>
      );
    }
    
    return (
      <span key={index} className="break-words whitespace-pre-wrap">
        {part}
      </span>
    );
  });
};

/**
 * Converts old LaTeX format to markdown math format
 * Converts \(...\) to $...$ and \[...\] to $$...$$
 */
const convertLaTeXToMarkdown = (text: string): string => {
  if (!text) return '';
  
  // Convert block math \[...\] to $$...$$
  let converted = text.replace(/\\\[([\s\S]*?)\\\]/g, (match, content) => {
    return `$$${content.trim()}$$`;
  });
  
  // Convert inline math \(...\) to $...$
  converted = converted.replace(/\\\(([\s\S]*?)\\\)/g, (match, content) => {
    return `$${content.trim()}$`;
  });
  
  return converted;
};

/**
 * Renders markdown text with support for math expressions (LaTeX)
 * This function combines markdown rendering with KaTeX for math expressions
 * Supports both old LaTeX format (\(...\) and \[...\]) and markdown math format ($...$ and $$...$$)
 */
export const renderMarkdownWithMath = (text: string) => {
  if (!text) return '';

  // Convert old LaTeX format to markdown math format
  const convertedText = convertLaTeXToMarkdown(text);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        // Customize code blocks
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <code className={className} {...props}>
              {children}
            </code>
          ) : (
            <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-sm" {...props}>
              {children}
            </code>
          );
        },
        // Customize paragraphs - preserve whitespace for plain text
        p({ children }) {
          return <p className="mb-2 last:mb-0 whitespace-pre-wrap break-words">{children}</p>;
        },
        // Customize headings
        h1({ children }) {
          return <h1 className="text-2xl font-bold mb-2 mt-4">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-xl font-bold mb-2 mt-4">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-lg font-bold mb-2 mt-4">{children}</h3>;
        },
        // Customize lists
        ul({ children }) {
          return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
        },
        li({ children }) {
          return <li className="ml-4">{children}</li>;
        },
        // Customize blockquotes
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic my-2">
              {children}
            </blockquote>
          );
        },
        // Customize links
        a({ href, children }) {
          return (
            <a
              href={href}
              className="text-blue-600 dark:text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          );
        },
        // Customize strong/bold
        strong({ children }) {
          return <strong className="font-bold">{children}</strong>;
        },
        // Customize emphasis/italic
        em({ children }) {
          return <em className="italic">{children}</em>;
        },
        // Customize horizontal rule
        hr() {
          return <hr className="my-4 border-gray-300 dark:border-gray-600" />;
        },
      }}
    >
      {convertedText}
    </ReactMarkdown>
  );
}; 