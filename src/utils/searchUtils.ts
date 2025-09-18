import Fuse from 'fuse.js';
import { readContentFile, findContentFiles } from './fileUtils';
import type { ContentFile, SearchResult, NoteSearchOptions } from '../types/index';
import { NoteSearchOptionsSchema, parseWithSchema } from '../types/index';

export async function searchNotes(
  options: NoteSearchOptions
): Promise<SearchResult[]> {
  const validatedOptions = parseWithSchema(NoteSearchOptionsSchema, options);
  const { query, directory = process.cwd(), includeContent, maxResults, fuzzy } = validatedOptions;
  
  // Find all content files in the directory
  const filePaths = await findContentFiles(directory);
  const files: ContentFile[] = [];
  
  // Read all files
  for (const filePath of filePaths) {
    try {
      const file = await readContentFile(filePath);
      files.push(file);
    } catch (error) {
      console.warn(`Failed to read file ${filePath}:`, error);
      continue;
    }
  }
  
  if (fuzzy) {
    return performFuzzySearch(files, query, maxResults || 10, includeContent || true);
  } else {
    return performExactSearch(files, query, maxResults || 10, includeContent || true);
  }
}

function performFuzzySearch(
  files: ContentFile[],
  query: string,
  maxResults: number,
  includeContent: boolean
): SearchResult[] {
  const fuseOptions = {
    keys: [
      { name: 'name', weight: 0.4 },
      { name: 'content', weight: 0.3 },
      { name: 'frontmatter.title', weight: 0.2 },
      { name: 'frontmatter.tags', weight: 0.1 }
    ],
    threshold: 0.3, // Lower is more strict
    includeMatches: true,
    includeScore: true,
    minMatchCharLength: 2
  };
  
  const fuse = new Fuse(files, fuseOptions);
  const fuseResults = fuse.search(query, { limit: maxResults });
  
  return fuseResults.map((result): SearchResult => {
    const file = includeContent ? result.item : { ...result.item, content: '' };
    // @ts-ignore
    const matches = extractMatches(result.matches || []);
    
    return {
      file,
      score: 1 - (result.score || 0), // Invert score so higher is better
      matches
    };
  });
}

function performExactSearch(
  files: ContentFile[],
  query: string,
  maxResults: number,
  includeContent: boolean
): SearchResult[] {
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();
  
  for (const file of files) {
    const matches: string[] = [];
    let score = 0;
    
    // Search in filename
    if (file.name.toLowerCase().includes(queryLower)) {
      matches.push(`Filename: ${file.name}`);
      score += 0.4;
    }
    
    // Search in content
    const contentLines = file.content.split('\n');
    for (let i = 0; i < contentLines.length; i++) {
      const line = contentLines[i];
      if (line && line.toLowerCase().includes(queryLower)) {
        matches.push(`Line ${i + 1}: ${line.trim()}`);
        score += 0.1;
      }
    }
    
    // Search in frontmatter
    if (file.frontmatter) {
      for (const [key, value] of Object.entries(file.frontmatter)) {
        if (typeof value === 'string' && value.toLowerCase().includes(queryLower)) {
          matches.push(`${key}: ${value}`);
          score += 0.2;
        }
      }
    }
    
    if (matches.length > 0) {
      const resultFile = includeContent ? file : { ...file, content: '' };
      results.push({
        file: resultFile,
        score: Math.min(score, 1), // Cap score at 1
        matches: matches.slice(0, 5) // Limit matches per file
      });
    }
  }
  
  // Sort by score and limit results
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

function extractMatches(fuseMatches: any[]): string[] {
  const matches: string[] = [];
  
  for (const match of fuseMatches) {
    const { key, value } = match;
    if (typeof value === 'string') {
      const truncated = value.length > 100 ? `${value.substring(0, 100)}...` : value;
      matches.push(`${key}: ${truncated}`);
    }
  }
  
  return matches.slice(0, 5); // Limit to 5 matches per result
}

export async function searchByTags(
  directory: string,
  tags: string[]
): Promise<ContentFile[]> {
  const filePaths = await findContentFiles(directory);
  const matchingFiles: ContentFile[] = [];
  
  for (const filePath of filePaths) {
    try {
      const file = await readContentFile(filePath);
      
      if (file.frontmatter?.tags) {
        const fileTags = Array.isArray(file.frontmatter.tags) 
          ? file.frontmatter.tags 
          : [file.frontmatter.tags];
          
        const hasMatchingTag = tags.some(tag => 
          fileTags.some((fileTag: any) => 
            typeof fileTag === 'string' && 
            fileTag.toLowerCase() === tag.toLowerCase()
          )
        );
        
        if (hasMatchingTag) {
          matchingFiles.push(file);
        }
      }
    } catch (error) {
      console.warn(`Failed to read file ${filePath}:`, error);
      continue;
    }
  }
  
  return matchingFiles.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
}

export async function searchByDateRange(
  directory: string,
  startDate: Date,
  endDate: Date
): Promise<ContentFile[]> {
  const filePaths = await findContentFiles(directory);
  const matchingFiles: ContentFile[] = [];
  
  for (const filePath of filePaths) {
    try {
      const file = await readContentFile(filePath);
      
      if (file.lastModified >= startDate && file.lastModified <= endDate) {
        matchingFiles.push(file);
      }
    } catch (error) {
      console.warn(`Failed to read file ${filePath}:`, error);
      continue;
    }
  }
  
  return matchingFiles.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
}
