---
title: Getting Started with TypeScript MCP Server
tags: [typescript, mcp, tutorial, getting-started]
author: Content Manager
date: 2024-01-15
category: tutorial
---

# Getting Started with TypeScript MCP Server

This is a sample note demonstrating the capabilities of the Content Manager MCP Server.

## Features

### Markdown Processing
The server can process Markdown files with full frontmatter support:

- Parse YAML frontmatter
- Generate table of contents
- Extract headings
- Render to HTML

### Search Capabilities
You can search through your notes using various methods:

1. **Fuzzy Search** - Find content even with typos
2. **Exact Search** - Precise text matching
3. **Tag-based Search** - Filter by frontmatter tags
4. **Date Range Search** - Find files by modification date

## Code Examples

Here's how you might use the search functionality:

```typescript
// Fuzzy search example
const results = await searchNotes({
  query: "typescript mcp",
  fuzzy: true,
  maxResults: 10
});

// Tag-based search
const taggedFiles = await searchByTags(['typescript', 'tutorial']);
```

## Conclusion

This MCP server provides a comprehensive solution for content management with TypeScript, Zod validation, and modern tooling.