#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { marked } from 'marked';
import Fuse from 'fuse.js';
import { readFile, stat } from 'fs/promises';
import { basename, extname } from 'path';
import { glob } from 'glob';
import matter from 'gray-matter';

var ContentFileSchema = z.object({
  path: z.string(),
  name: z.string(),
  content: z.string(),
  frontmatter: z.record(z.unknown()).optional(),
  lastModified: z.date(),
  size: z.number().int().nonnegative()
});
z.object({
  file: ContentFileSchema,
  score: z.number().min(0).max(1),
  matches: z.array(z.string())
});
var MarkdownProcessingOptionsSchema = z.object({
  generateToc: z.boolean().default(true),
  sanitizeHtml: z.boolean().default(true),
  enableCodeHighlight: z.boolean().default(true)
});
z.object({
  template: z.string().optional(),
  outputFormat: z.enum(["html", "pdf", "markdown"]).default("html"),
  includeMetadata: z.boolean().default(true),
  customStyles: z.string().optional()
});
var NoteSearchOptionsSchema = z.object({
  query: z.string().min(1),
  directory: z.string().optional(),
  includeContent: z.boolean().default(true),
  maxResults: z.number().int().positive().default(10),
  fuzzy: z.boolean().default(true)
});
z.object({
  totalFiles: z.number().int().nonnegative(),
  totalSize: z.number().nonnegative(),
  fileTypes: z.record(z.number().int().nonnegative()),
  lastUpdated: z.date()
});
function parseWithSchema(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }
  return result.data;
}

// src/utils/markdownUtils.ts
marked.setOptions({
  gfm: true,
  breaks: true
});
function renderMarkdown(content, options = {}) {
  const opts = MarkdownProcessingOptionsSchema.parse(options);
  let processedContent = content;
  if (opts.generateToc) {
    const toc = generateTableOfContents(content);
    if (toc) {
      processedContent = `${toc}

${content}`;
    }
  }
  const html = marked(processedContent);
  if (html instanceof Promise) {
    throw new Error("Async marked processing not supported in this function. Use async version.");
  }
  if (opts.sanitizeHtml) {
    return sanitizeHtml(html);
  }
  return html;
}
function generateTableOfContents(content) {
  const headings = extractHeadings(content);
  if (headings.length === 0) {
    return null;
  }
  const toc = headings.map(({ level, text, id }) => {
    const indent = "  ".repeat(level - 1);
    return `${indent}- [${text}](#${id})`;
  }).join("\n");
  return `## Table of Contents

${toc}`;
}
function extractHeadings(content) {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings = [];
  let match;
  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1]?.length ?? 0;
    const text = match[2]?.trim() ?? "";
    const id = text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
    headings.push({ level, text, id });
  }
  return headings;
}
function extractFrontmatter(content) {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontmatterRegex);
  if (!match) {
    return { frontmatter: {}, content };
  }
  try {
    const yamlContent = match[1] ?? "";
    const frontmatter = parseSimpleYaml(yamlContent);
    const contentWithoutFrontmatter = content.slice(match[0].length);
    return { frontmatter, content: contentWithoutFrontmatter };
  } catch (error) {
    console.warn("Failed to parse frontmatter:", error);
    return { frontmatter: {}, content };
  }
}
function sanitizeHtml(html) {
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
  html = html.replace(/javascript:/gi, "");
  return html;
}
function parseSimpleYaml(yaml) {
  const result = {};
  const lines = yaml.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;
    const key = trimmed.slice(0, colonIndex).trim();
    let value = trimmed.slice(colonIndex + 1).trim();
    if (value === "true") value = true;
    else if (value === "false") value = false;
    else if (value === "null") value = null;
    else if (typeof value === "string" && /^\d+$/.test(value)) value = parseInt(value, 10);
    else if (typeof value === "string" && /^\d+\.\d+$/.test(value)) value = parseFloat(value);
    else if (typeof value === "string") {
      if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
    }
    result[key] = value;
  }
  return result;
}
async function readContentFile(filePath) {
  const content = await readFile(filePath, "utf-8");
  const stats = await stat(filePath);
  let frontmatter;
  let processedContent = content;
  if (filePath.endsWith(".md") || filePath.endsWith(".markdown")) {
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
async function findContentFiles(directory, extensions = [".md", ".markdown", ".txt", ".mdx"]) {
  const patterns = extensions.map((ext) => `**/*${ext}`);
  const files = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, { cwd: directory, absolute: true });
    files.push(...matches);
  }
  return [...new Set(files)];
}
async function getDirectoryStats(directory) {
  const files = await findContentFiles(directory);
  const stats = {
    totalFiles: files.length,
    totalSize: 0,
    fileTypes: {}
  };
  for (const file of files) {
    const fileStat = await stat(file);
    stats.totalSize += fileStat.size;
    const ext = extname(file);
    stats.fileTypes[ext] = (stats.fileTypes[ext] || 0) + 1;
  }
  return stats;
}

// src/utils/searchUtils.ts
async function searchNotes(options) {
  const validatedOptions = parseWithSchema(NoteSearchOptionsSchema, options);
  const { query, directory = process.cwd(), includeContent, maxResults, fuzzy } = validatedOptions;
  const filePaths = await findContentFiles(directory);
  const files = [];
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
    return performFuzzySearch(files, query, maxResults || 10);
  } else {
    return performExactSearch(files, query, maxResults || 10);
  }
}
function performFuzzySearch(files, query, maxResults, includeContent) {
  const fuseOptions = {
    keys: [
      { name: "name", weight: 0.4 },
      { name: "content", weight: 0.3 },
      { name: "frontmatter.title", weight: 0.2 },
      { name: "frontmatter.tags", weight: 0.1 }
    ],
    threshold: 0.3,
    // Lower is more strict
    includeMatches: true,
    includeScore: true,
    minMatchCharLength: 2
  };
  const fuse = new Fuse(files, fuseOptions);
  const fuseResults = fuse.search(query, { limit: maxResults });
  return fuseResults.map((result) => {
    const file = result.item ;
    const matches = extractMatches(result.matches || []);
    return {
      file,
      score: 1 - (result.score || 0),
      // Invert score so higher is better
      matches
    };
  });
}
function performExactSearch(files, query, maxResults, includeContent) {
  const results = [];
  const queryLower = query.toLowerCase();
  for (const file of files) {
    const matches = [];
    let score = 0;
    if (file.name.toLowerCase().includes(queryLower)) {
      matches.push(`Filename: ${file.name}`);
      score += 0.4;
    }
    const contentLines = file.content.split("\n");
    for (let i = 0; i < contentLines.length; i++) {
      const line = contentLines[i];
      if (line && line.toLowerCase().includes(queryLower)) {
        matches.push(`Line ${i + 1}: ${line.trim()}`);
        score += 0.1;
      }
    }
    if (file.frontmatter) {
      for (const [key, value] of Object.entries(file.frontmatter)) {
        if (typeof value === "string" && value.toLowerCase().includes(queryLower)) {
          matches.push(`${key}: ${value}`);
          score += 0.2;
        }
      }
    }
    if (matches.length > 0) {
      const resultFile = file ;
      results.push({
        file: resultFile,
        score: Math.min(score, 1),
        // Cap score at 1
        matches: matches.slice(0, 5)
        // Limit matches per file
      });
    }
  }
  return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
}
function extractMatches(fuseMatches) {
  const matches = [];
  for (const match of fuseMatches) {
    const { key, value } = match;
    if (typeof value === "string") {
      const truncated = value.length > 100 ? `${value.substring(0, 100)}...` : value;
      matches.push(`${key}: ${truncated}`);
    }
  }
  return matches.slice(0, 5);
}
async function searchByTags(directory, tags) {
  const filePaths = await findContentFiles(directory);
  const matchingFiles = [];
  for (const filePath of filePaths) {
    try {
      const file = await readContentFile(filePath);
      if (file.frontmatter?.tags) {
        const fileTags = Array.isArray(file.frontmatter.tags) ? file.frontmatter.tags : [file.frontmatter.tags];
        const hasMatchingTag = tags.some(
          (tag) => fileTags.some(
            (fileTag) => typeof fileTag === "string" && fileTag.toLowerCase() === tag.toLowerCase()
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
async function searchByDateRange(directory, startDate, endDate) {
  const filePaths = await findContentFiles(directory);
  const matchingFiles = [];
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

// src/tools/index.ts
var RenderMarkdownArgsSchema = z.object({
  content: z.string().min(1, "Content cannot be empty"),
  generateToc: z.boolean().default(true),
  sanitizeHtml: z.boolean().default(true),
  enableCodeHighlight: z.boolean().default(true)
});
var SearchNotesArgsSchema = z.object({
  query: z.string().min(1, "Query cannot be empty"),
  directory: z.string().optional(),
  includeContent: z.boolean().default(true),
  maxResults: z.number().int().positive().default(10),
  fuzzy: z.boolean().default(true)
});
var SearchByTagsArgsSchema = z.object({
  tags: z.array(z.string()).min(1, "At least one tag is required"),
  directory: z.string().default(process.cwd())
});
var SearchByDateRangeArgsSchema = z.object({
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid start date"),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid end date"),
  directory: z.string().default(process.cwd())
});
var GenerateTableOfContentsArgsSchema = z.object({
  content: z.string().min(1, "Content cannot be empty")
});
var ExtractHeadingsArgsSchema = z.object({
  content: z.string().min(1, "Content cannot be empty")
});
var ExtractFrontmatterArgsSchema = z.object({
  content: z.string().min(1, "Content cannot be empty")
});
var GetDirectoryStatsArgsSchema = z.object({
  directory: z.string().default(process.cwd())
});
var FindContentFilesArgsSchema = z.object({
  directory: z.string().default(process.cwd()),
  extensions: z.array(z.string()).default([".md", ".markdown", ".txt", ".mdx"])
});
var ReadContentFileArgsSchema = z.object({
  filePath: z.string().min(1, "File path cannot be empty")
});
var tools = {
  render_markdown: {
    description: "Render Markdown content to HTML with optional table of contents generation and HTML sanitization",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The Markdown content to render"
        },
        generateToc: {
          type: "boolean",
          description: "Whether to generate a table of contents",
          default: true
        },
        sanitizeHtml: {
          type: "boolean",
          description: "Whether to sanitize the resulting HTML",
          default: true
        },
        enableCodeHighlight: {
          type: "boolean",
          description: "Whether to enable code syntax highlighting",
          default: true
        }
      },
      required: ["content"]
    },
    handler: async (args) => {
      const { content, generateToc, sanitizeHtml: sanitizeHtml2, enableCodeHighlight } = RenderMarkdownArgsSchema.parse(args);
      const html = renderMarkdown(content, {
        generateToc,
        sanitizeHtml: sanitizeHtml2,
        enableCodeHighlight
      });
      return {
        content: [{ type: "text", text: html }]
      };
    }
  },
  search_notes: {
    description: "Search through notes and documents using fuzzy or exact matching",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query"
        },
        directory: {
          type: "string",
          description: "The directory to search in (defaults to current directory)"
        },
        includeContent: {
          type: "boolean",
          description: "Whether to include file content in results",
          default: true
        },
        maxResults: {
          type: "number",
          description: "Maximum number of results to return",
          default: 10
        },
        fuzzy: {
          type: "boolean",
          description: "Whether to use fuzzy search",
          default: true
        }
      },
      required: ["query"]
    },
    handler: async (args) => {
      const searchOptions = SearchNotesArgsSchema.parse(args);
      const results = await searchNotes(searchOptions);
      const formattedResults = results.map((result, index) => {
        const { file, score, matches } = result;
        return `**Result ${index + 1}** (Score: ${(score * 100).toFixed(1)}%)
**File:** ${file.name}
**Path:** ${file.path}
**Last Modified:** ${file.lastModified.toISOString()}
**Matches:**
${matches.map((match) => `- ${match}`).join("\\n")}
${searchOptions.includeContent && file.content ? `\\n**Content Preview:**\\n${file.content.slice(0, 200)}...` : ""}
---`;
      }).join("\\n\\n");
      return {
        content: [{
          type: "text",
          text: results.length > 0 ? formattedResults : "No results found for the given query."
        }]
      };
    }
  },
  search_by_tags: {
    description: "Search for files by tags in their frontmatter",
    inputSchema: {
      type: "object",
      properties: {
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Array of tags to search for"
        },
        directory: {
          type: "string",
          description: "The directory to search in",
          default: process.cwd()
        }
      },
      required: ["tags"]
    },
    handler: async (args) => {
      const { tags, directory } = SearchByTagsArgsSchema.parse(args);
      const results = await searchByTags(directory, tags);
      if (results.length === 0) {
        return {
          content: [{ type: "text", text: `No files found with tags: ${tags.join(", ")}` }]
        };
      }
      const formattedResults = results.map((file, index) => {
        const fileTags = file.frontmatter?.tags || [];
        return `**${index + 1}. ${file.name}**
Path: ${file.path}
Tags: ${Array.isArray(fileTags) ? fileTags.join(", ") : fileTags}
Last Modified: ${file.lastModified.toISOString()}
Size: ${file.size} bytes`;
      }).join("\\n\\n");
      return {
        content: [{ type: "text", text: formattedResults }]
      };
    }
  },
  search_by_date_range: {
    description: "Search for files modified within a specific date range",
    inputSchema: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description: "Start date in ISO format (YYYY-MM-DD)"
        },
        endDate: {
          type: "string",
          description: "End date in ISO format (YYYY-MM-DD)"
        },
        directory: {
          type: "string",
          description: "The directory to search in",
          default: process.cwd()
        }
      },
      required: ["startDate", "endDate"]
    },
    handler: async (args) => {
      const { startDate, endDate, directory } = SearchByDateRangeArgsSchema.parse(args);
      const results = await searchByDateRange(
        directory,
        new Date(startDate),
        new Date(endDate)
      );
      if (results.length === 0) {
        return {
          content: [{ type: "text", text: `No files found between ${startDate} and ${endDate}` }]
        };
      }
      const formattedResults = results.map((file, index) => {
        return `**${index + 1}. ${file.name}**
Path: ${file.path}
Last Modified: ${file.lastModified.toISOString()}
Size: ${file.size} bytes`;
      }).join("\\n\\n");
      return {
        content: [{ type: "text", text: formattedResults }]
      };
    }
  },
  generate_table_of_contents: {
    description: "Generate a table of contents from Markdown content",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The Markdown content to analyze"
        }
      },
      required: ["content"]
    },
    handler: async (args) => {
      const { content } = GenerateTableOfContentsArgsSchema.parse(args);
      const toc = generateTableOfContents(content);
      return {
        content: [{
          type: "text",
          text: toc || "No headings found in the content."
        }]
      };
    }
  },
  extract_headings: {
    description: "Extract all headings from Markdown content",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The Markdown content to analyze"
        }
      },
      required: ["content"]
    },
    handler: async (args) => {
      const { content } = ExtractHeadingsArgsSchema.parse(args);
      const headings = extractHeadings(content);
      if (headings.length === 0) {
        return {
          content: [{ type: "text", text: "No headings found in the content." }]
        };
      }
      const formattedHeadings = headings.map((heading) => {
        const indent = "  ".repeat(heading.level - 1);
        return `${indent}${"#".repeat(heading.level)} ${heading.text} (id: ${heading.id})`;
      }).join("\\n");
      return {
        content: [{ type: "text", text: formattedHeadings }]
      };
    }
  },
  extract_frontmatter: {
    description: "Extract frontmatter from Markdown content",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The Markdown content to analyze"
        }
      },
      required: ["content"]
    },
    handler: async (args) => {
      const { content } = ExtractFrontmatterArgsSchema.parse(args);
      const { frontmatter, content: contentWithoutFrontmatter } = extractFrontmatter(content);
      const result = {
        frontmatter,
        contentLength: contentWithoutFrontmatter.length,
        hasFrontmatter: Object.keys(frontmatter).length > 0
      };
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    }
  },
  get_directory_stats: {
    description: "Get statistics about content files in a directory",
    inputSchema: {
      type: "object",
      properties: {
        directory: {
          type: "string",
          description: "The directory to analyze",
          default: process.cwd()
        }
      }
    },
    handler: async (args) => {
      const { directory } = GetDirectoryStatsArgsSchema.parse(args);
      const stats = await getDirectoryStats(directory);
      const result = {
        directory,
        ...stats,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
        averageFileSize: stats.totalFiles > 0 ? Math.round(stats.totalSize / stats.totalFiles) : 0
      };
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    }
  },
  find_content_files: {
    description: "Find all content files in a directory with specific extensions",
    inputSchema: {
      type: "object",
      properties: {
        directory: {
          type: "string",
          description: "The directory to search in",
          default: process.cwd()
        },
        extensions: {
          type: "array",
          items: { type: "string" },
          description: "File extensions to search for",
          default: [".md", ".markdown", ".txt", ".mdx"]
        }
      }
    },
    handler: async (args) => {
      const { directory, extensions } = FindContentFilesArgsSchema.parse(args);
      const files = await findContentFiles(directory, extensions);
      if (files.length === 0) {
        return {
          content: [{ type: "text", text: `No files found with extensions: ${extensions.join(", ")}` }]
        };
      }
      const formattedFiles = files.map(
        (file, index) => `${index + 1}. ${file}`
      ).join("\\n");
      return {
        content: [{
          type: "text",
          text: `Found ${files.length} files:\\n\\n${formattedFiles}`
        }]
      };
    }
  },
  read_content_file: {
    description: "Read and parse a content file (supports Markdown with frontmatter)",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Path to the file to read"
        }
      },
      required: ["filePath"]
    },
    handler: async (args) => {
      const { filePath } = ReadContentFileArgsSchema.parse(args);
      const file = await readContentFile(filePath);
      const result = {
        name: file.name,
        path: file.path,
        size: file.size,
        lastModified: file.lastModified.toISOString(),
        hasFrontmatter: !!file.frontmatter && Object.keys(file.frontmatter).length > 0,
        frontmatter: file.frontmatter,
        contentPreview: file.content.slice(0, 500) + (file.content.length > 500 ? "..." : ""),
        contentLength: file.content.length
      };
      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2)
        }]
      };
    }
  }
};

// src/index.ts
var ContentManagerMCPServer = class {
  server;
  constructor() {
    this.server = new Server(
      {
        name: "content-manager-mcp",
        version: "1.0.0"
      }
    );
    this.setupToolHandlers();
    this.setupErrorHandling();
  }
  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Object.entries(tools).map(([name, tool]) => ({
          name,
          description: tool.description,
          inputSchema: tool.inputSchema
        }))
      };
    });
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      if (!name || !(name in tools)) {
        throw new Error(`Unknown tool: ${name}`);
      }
      try {
        const tool = tools[name];
        const result = await tool.handler(args ?? {});
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        return {
          content: [
            {
              type: "text",
              text: `Error executing tool "${name}": ${errorMessage}`
            }
          ],
          isError: true
        };
      }
    });
  }
  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
    process.on("SIGTERM", async () => {
      await this.server.close();
      process.exit(0);
    });
  }
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Content Manager MCP Server running on stdio");
    console.error("Available tools:", Object.keys(tools).join(", "));
  }
};
async function main() {
  const server = new ContentManagerMCPServer();
  await server.run();
}
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map