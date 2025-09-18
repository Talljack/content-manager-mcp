import { z } from 'zod';

// Zod schemas for runtime validation
export const ContentFileSchema = z.object({
  path: z.string(),
  name: z.string(),
  content: z.string(),
  frontmatter: z.record(z.unknown()).optional(),
  lastModified: z.date(),
  size: z.number().int().nonnegative()
});

export const SearchResultSchema = z.object({
  file: ContentFileSchema,
  score: z.number().min(0).max(1),
  matches: z.array(z.string())
});

export const MarkdownProcessingOptionsSchema = z.object({
  generateToc: z.boolean().default(true),
  sanitizeHtml: z.boolean().default(true),
  enableCodeHighlight: z.boolean().default(true)
});

export const DocumentGenerationOptionsSchema = z.object({
  template: z.string().optional(),
  outputFormat: z.enum(['html', 'pdf', 'markdown']).default('html'),
  includeMetadata: z.boolean().default(true),
  customStyles: z.string().optional()
});

export const NoteSearchOptionsSchema = z.object({
  query: z.string().min(1),
  directory: z.string().optional(),
  includeContent: z.boolean().default(true),
  maxResults: z.number().int().positive().default(10),
  fuzzy: z.boolean().default(true)
});

export const ContentStatsSchema = z.object({
  totalFiles: z.number().int().nonnegative(),
  totalSize: z.number().nonnegative(),
  fileTypes: z.record(z.number().int().nonnegative()),
  lastUpdated: z.date()
});

// TypeScript types inferred from Zod schemas
export type ContentFile = z.infer<typeof ContentFileSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type MarkdownProcessingOptions = z.infer<typeof MarkdownProcessingOptionsSchema>;
export type DocumentGenerationOptions = z.infer<typeof DocumentGenerationOptionsSchema>;
export type NoteSearchOptions = z.infer<typeof NoteSearchOptionsSchema>;
export type ContentStats = z.infer<typeof ContentStatsSchema>;

// Utility function for safe parsing
export function parseWithSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }
  return result.data;
}
