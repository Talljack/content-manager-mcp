import { marked } from 'marked';
import type { MarkdownProcessingOptions } from '../types/index.js';
import { MarkdownProcessingOptionsSchema } from '../types/index.js';

// Configure marked with safe defaults
marked.setOptions({
  gfm: true,
  breaks: true
});

export function renderMarkdown(
  content: string,
  options: Partial<MarkdownProcessingOptions> = {}
): string {
  const opts = MarkdownProcessingOptionsSchema.parse(options);
  
  let processedContent = content;
  
  // Generate table of contents if requested
  if (opts.generateToc) {
    const toc = generateTableOfContents(content);
    if (toc) {
      processedContent = `${toc}\n\n${content}`;
    }
  }
  
  // Render markdown to HTML
  const html = marked(processedContent);
  
  // Handle both sync and async returns from marked
  if (html instanceof Promise) {
    throw new Error('Async marked processing not supported in this function. Use async version.');
  }
  
  // Sanitize HTML if requested (basic sanitization)
  if (opts.sanitizeHtml) {
    return sanitizeHtml(html);
  }
  
  return html;
}

export function generateTableOfContents(content: string): string | null {
  const headings = extractHeadings(content);
  
  if (headings.length === 0) {
    return null;
  }
  
  const toc = headings
    .map(({ level, text, id }) => {
      const indent = '  '.repeat(level - 1);
      return `${indent}- [${text}](#${id})`;
    })
    .join('\n');
    
  return `## Table of Contents\n\n${toc}`;
}

export function extractHeadings(content: string): Array<{
  level: number;
  text: string;
  id: string;
}> {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: Array<{ level: number; text: string; id: string }> = [];
  
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1]?.length ?? 0;
    const text = match[2]?.trim() ?? '';
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
      
    headings.push({ level, text, id });
  }
  
  return headings;
}

export function extractFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  content: string;
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return { frontmatter: {}, content };
  }
  
  try {
    // Simple YAML parsing for frontmatter
    const yamlContent = match[1] ?? '';
    const frontmatter = parseSimpleYaml(yamlContent);
    const contentWithoutFrontmatter = content.slice(match[0].length);
    
    return { frontmatter, content: contentWithoutFrontmatter };
  } catch (error) {
    console.warn('Failed to parse frontmatter:', error);
    return { frontmatter: {}, content };
  }
}

// Basic HTML sanitization (you might want to use a proper library like DOMPurify)
function sanitizeHtml(html: string): string {
  // Remove script tags and their content
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove on* attributes (onclick, onload, etc.)
  html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: protocols
  html = html.replace(/javascript:/gi, '');
  
  return html;
}

// Simple YAML parser for basic frontmatter
function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = yaml.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = trimmed.slice(0, colonIndex).trim();
    let value: unknown = trimmed.slice(colonIndex + 1).trim();
    
    // Basic type inference
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (value === 'null') value = null;
    else if (typeof value === 'string' && /^\d+$/.test(value)) value = parseInt(value, 10);
    else if (typeof value === 'string' && /^\d+\.\d+$/.test(value)) value = parseFloat(value);
    else if (typeof value === 'string') {
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
    }
    
    result[key] = value;
  }
  
  return result;
}
