import { readFile, stat, readdir } from 'fs/promises';
import { join, extname, basename } from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';
import type { ContentFile } from '../types/index.js';

export async function readContentFile(filePath: string): Promise<ContentFile> {
  const content = await readFile(filePath, 'utf-8');
  const stats = await stat(filePath);
  
  let frontmatter: Record<string, any> | undefined;
  let processedContent = content;
  
  // Parse frontmatter if it exists
  if (filePath.endsWith('.md') || filePath.endsWith('.markdown')) {
    const parsed = matter(content);
    frontmatter = parsed.data;
    processedContent = parsed.content;
  }
  
  return {
    path: filePath,
    name: basename(filePath),
    content: processedContent,
    frontmatter,
    lastModified: stats.mtime,
    size: stats.size
  };
}

export async function findContentFiles(
  directory: string,
  extensions: string[] = ['.md', '.markdown', '.txt', '.mdx']
): Promise<string[]> {
  const patterns = extensions.map(ext => `**/*${ext}`);
  const files: string[] = [];
  
  for (const pattern of patterns) {
    const matches = await glob(pattern, { cwd: directory, absolute: true });
    files.push(...matches);
  }
  
  return [...new Set(files)]; // Remove duplicates
}

export async function getDirectoryStats(directory: string): Promise<{
  totalFiles: number;
  totalSize: number;
  fileTypes: Record<string, number>;
}> {
  const files = await findContentFiles(directory);
  const stats = {
    totalFiles: files.length,
    totalSize: 0,
    fileTypes: {} as Record<string, number>
  };
  
  for (const file of files) {
    const fileStat = await stat(file);
    stats.totalSize += fileStat.size;
    
    const ext = extname(file);
    stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
  }
  
  return stats;
}

export function sanitizePath(path: string): string {
  // Basic path sanitization to prevent directory traversal
  return path.replace(/\.\.\//g, '').replace(/\.\.\\\\/g, '');
}

export function isMarkdownFile(filename: string): boolean {
  const ext = extname(filename).toLowerCase();
  return ['.md', '.markdown', '.mdx'].includes(ext);
}