import { z } from 'zod';
import { 
  renderMarkdown, 
  generateTableOfContents, 
  extractHeadings,
  extractFrontmatter 
} from '../utils/markdownUtils.js';
import { 
  searchNotes, 
  searchByTags, 
  searchByDateRange 
} from '../utils/searchUtils.js';
import { 
  getDirectoryStats, 
  findContentFiles, 
  readContentFile 
} from '../utils/fileUtils.js';

// Tool argument schemas with Zod validation
export const RenderMarkdownArgsSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty'),
  generateToc: z.boolean().default(true),
  sanitizeHtml: z.boolean().default(true),
  enableCodeHighlight: z.boolean().default(true)
});

export const SearchNotesArgsSchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  directory: z.string().optional(),
  includeContent: z.boolean().default(true),
  maxResults: z.number().int().positive().default(10),
  fuzzy: z.boolean().default(true)
});

export const SearchByTagsArgsSchema = z.object({
  tags: z.array(z.string()).min(1, 'At least one tag is required'),
  directory: z.string().default(process.cwd())
});

export const SearchByDateRangeArgsSchema = z.object({
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid start date'),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid end date'),
  directory: z.string().default(process.cwd())
});

export const GenerateTableOfContentsArgsSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty')
});

export const ExtractHeadingsArgsSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty')
});

export const ExtractFrontmatterArgsSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty')
});

export const GetDirectoryStatsArgsSchema = z.object({
  directory: z.string().default(process.cwd())
});

export const FindContentFilesArgsSchema = z.object({
  directory: z.string().default(process.cwd()),
  extensions: z.array(z.string()).default(['.md', '.markdown', '.txt', '.mdx'])
});

export const ReadContentFileArgsSchema = z.object({
  filePath: z.string().min(1, 'File path cannot be empty')
});

// Tool implementations
export const tools = {
  render_markdown: {
    description: 'Render Markdown content to HTML with optional table of contents generation and HTML sanitization',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The Markdown content to render'
        },
        generateToc: {
          type: 'boolean',
          description: 'Whether to generate a table of contents',
          default: true
        },
        sanitizeHtml: {
          type: 'boolean',
          description: 'Whether to sanitize the resulting HTML',
          default: true
        },
        enableCodeHighlight: {
          type: 'boolean',
          description: 'Whether to enable code syntax highlighting',
          default: true
        }
      },
      required: ['content']
    },
    handler: async (args: any) => {
      const { content, generateToc, sanitizeHtml, enableCodeHighlight } = 
        RenderMarkdownArgsSchema.parse(args);
      
      const html = renderMarkdown(content, { 
        generateToc, 
        sanitizeHtml, 
        enableCodeHighlight 
      });
      
      return {
        content: [{ type: 'text', text: html }]
      };
    }
  },

  search_notes: {
    description: 'Search through notes and documents using fuzzy or exact matching',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query'
        },
        directory: {
          type: 'string',
          description: 'The directory to search in (defaults to current directory)'
        },
        includeContent: {
          type: 'boolean',
          description: 'Whether to include file content in results',
          default: true
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of results to return',
          default: 10
        },
        fuzzy: {
          type: 'boolean',
          description: 'Whether to use fuzzy search',
          default: true
        }
      },
      required: ['query']
    },
    handler: async (args: any) => {
      const searchOptions = SearchNotesArgsSchema.parse(args);
      const results = await searchNotes(searchOptions);
      
      const formattedResults = results.map((result, index) => {
        const { file, score, matches } = result;
        return `**Result ${index + 1}** (Score: ${(score * 100).toFixed(1)}%)
**File:** ${file.name}
**Path:** ${file.path}
**Last Modified:** ${file.lastModified.toISOString()}
**Matches:**
${matches.map(match => `- ${match}`).join('\\n')}
${searchOptions.includeContent && file.content ? `\\n**Content Preview:**\\n${file.content.slice(0, 200)}...` : ''}
---`;
      }).join('\\n\\n');
      
      return {
        content: [{ 
          type: 'text', 
          text: results.length > 0 ? formattedResults : 'No results found for the given query.' 
        }]
      };
    }
  },

  search_by_tags: {
    description: 'Search for files by tags in their frontmatter',
    inputSchema: {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of tags to search for'
        },
        directory: {
          type: 'string',
          description: 'The directory to search in',
          default: process.cwd()
        }
      },
      required: ['tags']
    },
    handler: async (args: any) => {
      const { tags, directory } = SearchByTagsArgsSchema.parse(args);
      const results = await searchByTags(directory, tags);
      
      if (results.length === 0) {
        return {
          content: [{ type: 'text', text: `No files found with tags: ${tags.join(', ')}` }]
        };
      }
      
      const formattedResults = results.map((file, index) => {
        const fileTags = file.frontmatter?.tags || [];
        return `**${index + 1}. ${file.name}**
Path: ${file.path}
Tags: ${Array.isArray(fileTags) ? fileTags.join(', ') : fileTags}
Last Modified: ${file.lastModified.toISOString()}
Size: ${file.size} bytes`;
      }).join('\\n\\n');
      
      return {
        content: [{ type: 'text', text: formattedResults }]
      };
    }
  },

  search_by_date_range: {
    description: 'Search for files modified within a specific date range',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Start date in ISO format (YYYY-MM-DD)'
        },
        endDate: {
          type: 'string',
          description: 'End date in ISO format (YYYY-MM-DD)'
        },
        directory: {
          type: 'string',
          description: 'The directory to search in',
          default: process.cwd()
        }
      },
      required: ['startDate', 'endDate']
    },
    handler: async (args: any) => {
      const { startDate, endDate, directory } = SearchByDateRangeArgsSchema.parse(args);
      const results = await searchByDateRange(
        directory, 
        new Date(startDate), 
        new Date(endDate)
      );
      
      if (results.length === 0) {
        return {
          content: [{ type: 'text', text: `No files found between ${startDate} and ${endDate}` }]
        };
      }
      
      const formattedResults = results.map((file, index) => {
        return `**${index + 1}. ${file.name}**
Path: ${file.path}
Last Modified: ${file.lastModified.toISOString()}
Size: ${file.size} bytes`;
      }).join('\\n\\n');
      
      return {
        content: [{ type: 'text', text: formattedResults }]
      };
    }
  },

  generate_table_of_contents: {
    description: 'Generate a table of contents from Markdown content',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The Markdown content to analyze'
        }
      },
      required: ['content']
    },
    handler: async (args: any) => {
      const { content } = GenerateTableOfContentsArgsSchema.parse(args);
      const toc = generateTableOfContents(content);
      
      return {
        content: [{ 
          type: 'text', 
          text: toc || 'No headings found in the content.' 
        }]
      };
    }
  },

  extract_headings: {
    description: 'Extract all headings from Markdown content',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The Markdown content to analyze'
        }
      },
      required: ['content']
    },
    handler: async (args: any) => {
      const { content } = ExtractHeadingsArgsSchema.parse(args);
      const headings = extractHeadings(content);
      
      if (headings.length === 0) {
        return {
          content: [{ type: 'text', text: 'No headings found in the content.' }]
        };
      }
      
      const formattedHeadings = headings.map(heading => {
        const indent = '  '.repeat(heading.level - 1);
        return `${indent}${'#'.repeat(heading.level)} ${heading.text} (id: ${heading.id})`;
      }).join('\\n');
      
      return {
        content: [{ type: 'text', text: formattedHeadings }]
      };
    }
  },

  extract_frontmatter: {
    description: 'Extract frontmatter from Markdown content',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'The Markdown content to analyze'
        }
      },
      required: ['content']
    },
    handler: async (args: any) => {
      const { content } = ExtractFrontmatterArgsSchema.parse(args);
      const { frontmatter, content: contentWithoutFrontmatter } = extractFrontmatter(content);
      
      const result = {
        frontmatter,
        contentLength: contentWithoutFrontmatter.length,
        hasFrontmatter: Object.keys(frontmatter).length > 0
      };
      
      return {
        content: [{ 
          type: 'text', 
          text: JSON.stringify(result, null, 2) 
        }]
      };
    }
  },

  get_directory_stats: {
    description: 'Get statistics about content files in a directory',
    inputSchema: {
      type: 'object',
      properties: {
        directory: {
          type: 'string',
          description: 'The directory to analyze',
          default: process.cwd()
        }
      }
    },
    handler: async (args: any) => {
      const { directory } = GetDirectoryStatsArgsSchema.parse(args);
      const stats = await getDirectoryStats(directory);
      
      const result = {
        directory,
        ...stats,
        lastUpdated: new Date().toISOString(),
        averageFileSize: stats.totalFiles > 0 ? Math.round(stats.totalSize / stats.totalFiles) : 0
      };
      
      return {
        content: [{ 
          type: 'text', 
          text: JSON.stringify(result, null, 2) 
        }]
      };
    }
  },

  find_content_files: {
    description: 'Find all content files in a directory with specific extensions',
    inputSchema: {
      type: 'object',
      properties: {
        directory: {
          type: 'string',
          description: 'The directory to search in',
          default: process.cwd()
        },
        extensions: {
          type: 'array',
          items: { type: 'string' },
          description: 'File extensions to search for',
          default: ['.md', '.markdown', '.txt', '.mdx']
        }
      }
    },
    handler: async (args: any) => {
      const { directory, extensions } = FindContentFilesArgsSchema.parse(args);
      const files = await findContentFiles(directory, extensions);
      
      if (files.length === 0) {
        return {
          content: [{ type: 'text', text: `No files found with extensions: ${extensions.join(', ')}` }]
        };
      }
      
      const formattedFiles = files.map((file, index) => 
        `${index + 1}. ${file}`
      ).join('\\n');
      
      return {
        content: [{ 
          type: 'text', 
          text: `Found ${files.length} files:\\n\\n${formattedFiles}` 
        }]
      };
    }
  },

  read_content_file: {
    description: 'Read and parse a content file (supports Markdown with frontmatter)',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the file to read'
        }
      },
      required: ['filePath']
    },
    handler: async (args: any) => {
      const { filePath } = ReadContentFileArgsSchema.parse(args);
      const file = await readContentFile(filePath);
      
      const result = {
        name: file.name,
        path: file.path,
        size: file.size,
        lastModified: file.lastModified.toISOString(),
        hasFrontmatter: !!file.frontmatter && Object.keys(file.frontmatter).length > 0,
        frontmatter: file.frontmatter,
        contentPreview: file.content.slice(0, 500) + (file.content.length > 500 ? '...' : ''),
        contentLength: file.content.length
      };
      
      return {
        content: [{ 
          type: 'text', 
          text: JSON.stringify(result, null, 2) 
        }]
      };
    }
  }
} as const;