# Content Manager MCP Server

A comprehensive TypeScript-based Model Context Protocol (MCP) server for content management, including Markdown processing, document generation, and intelligent note searching.

## 🚀 Features

### 📝 Markdown Processing
- **Render Markdown to HTML** with table of contents generation
- **Extract headings** and create structured navigation
- **Parse frontmatter** from Markdown files
- **HTML sanitization** for safe content processing

### 🔍 Intelligent Search
- **Fuzzy search** through notes using Fuse.js
- **Exact text matching** with context highlighting  
- **Tag-based filtering** using frontmatter metadata
- **Date range queries** for time-based content discovery

### 📊 Content Analysis
- **Directory statistics** showing file counts, sizes, and types
- **File discovery** with customizable extension filtering
- **Content preview** with metadata extraction

## 🛠 Tech Stack

- **TypeScript** - Type-safe development with latest ES2023 features
- **Zod** - Runtime schema validation and type inference
- **tsup** - Fast TypeScript bundler with ESM support
- **pnpm** - Efficient package management
- **Fuse.js** - Fuzzy search functionality
- **marked** - Markdown parsing and rendering

## 📦 Installation

### Option 1: NPM Package (Recommended)
```bash
# Install globally
npm install -g @yugangcao/content-manager-mcp

# Or use directly with npx
npx -y @yugangcao/content-manager-mcp
```

### Option 2: From Source
#### Prerequisites
- Node.js >= 20.0.0
- pnpm >= 9.0.0

#### Setup
```bash
# Clone and install dependencies
git clone <repository-url>
cd content-manager-mcp
pnpm install

# Build the project
pnpm build

# Run in development mode
pnpm dev
```

## 🔧 Usage

### As MCP Server
The server runs via stdio and implements the MCP protocol:

#### Using NPM Package
```bash
# If installed globally
content-manager-mcp

# Using npx (no installation required)
npx -y @yugangcao/content-manager-mcp
```

#### Using Source Build
```bash
node dist/index.js
```

### MCP Client Configuration

#### Claude Desktop
Add to your Claude Desktop configuration:
```json
{
  "mcpServers": {
    "content-manager": {
      "command": "npx",
      "args": ["-y", "@yugangcao/content-manager-mcp"]
    }
  }
}
```

#### Cherry Studio
Configure MCP server:
- **Command**: `npx`
- **Arguments**: `["-y", "@yugangcao/content-manager-mcp"]`

### Available Tools

#### `render_markdown`
Converts Markdown content to HTML with optional features:
```typescript
{
  content: string,           // Markdown content to render
  generateToc?: boolean,     // Generate table of contents (default: true)
  sanitizeHtml?: boolean,    // Sanitize output HTML (default: true)
  enableCodeHighlight?: boolean // Enable syntax highlighting (default: true)
}
```

#### `search_notes`
Intelligent search through content files:
```typescript
{
  query: string,             // Search query
  directory?: string,        // Directory to search (default: cwd)
  includeContent?: boolean,  // Include file content in results (default: true)
  maxResults?: number,       // Maximum results to return (default: 10)
  fuzzy?: boolean           // Use fuzzy search (default: true)
}
```

#### `search_by_tags`
Find files by frontmatter tags:
```typescript
{
  tags: string[],           // Array of tags to search for
  directory?: string        // Directory to search (default: cwd)
}
```

#### `search_by_date_range`
Find files by modification date:
```typescript
{
  startDate: string,        // ISO date string (YYYY-MM-DD)
  endDate: string,          // ISO date string (YYYY-MM-DD)
  directory?: string        // Directory to search (default: cwd)
}
```

#### `generate_table_of_contents`
Extract and format headings as a table of contents:
```typescript
{
  content: string           // Markdown content to analyze
}
```

#### `extract_headings`
Get structured heading information:
```typescript
{
  content: string           // Markdown content to analyze
}
```

#### `extract_frontmatter`
Parse YAML frontmatter from Markdown:
```typescript
{
  content: string           // Markdown content with frontmatter
}
```

#### `get_directory_stats`
Analyze directory content statistics:
```typescript
{
  directory?: string        // Directory to analyze (default: cwd)
}
```

#### `find_content_files`
Discover files with specific extensions:
```typescript
{
  directory?: string,           // Directory to search (default: cwd)
  extensions?: string[]         // File extensions (default: ['.md', '.markdown', '.txt', '.mdx'])
}
```

#### `read_content_file`
Read and parse a single content file:
```typescript
{
  filePath: string             // Path to file to read
}
```

## 🏗 Project Structure

```
content-manager-mcp/
├── src/
│   ├── types/          # Zod schemas and TypeScript types
│   ├── utils/          # Utility functions for file operations
│   │   ├── fileUtils.ts      # File system operations
│   │   ├── markdownUtils.ts  # Markdown processing
│   │   └── searchUtils.ts    # Search functionality
│   ├── tools/          # MCP tool definitions and handlers
│   └── index.ts        # Main server entry point
├── dist/               # Compiled output
├── tsup.config.ts      # Build configuration
├── tsconfig.json       # TypeScript configuration
└── package.json        # Project metadata and dependencies
```

## 🧪 Development

### Scripts
- `pnpm dev` - Development mode with watch
- `pnpm build` - Build for production
- `pnpm start` - Run built server
- `pnpm lint` - Check code style
- `pnpm lint:fix` - Fix code style issues
- `pnpm type-check` - TypeScript type checking
- `pnpm clean` - Clean build artifacts

### Type Safety
This project leverages Zod for runtime validation combined with TypeScript for compile-time safety. All tool arguments are validated at runtime, ensuring robust error handling and type safety.

### Error Handling
- Comprehensive error catching and reporting
- Zod validation errors with descriptive messages
- File system error handling
- Graceful degradation for malformed content

## 📝 Example Usage

### Frontmatter Format
The server recognizes YAML frontmatter in Markdown files:

```markdown
---
title: My Document
tags: [typescript, mcp, documentation]
author: Your Name
date: 2024-01-15
---

# Document Content

Your markdown content here...
```

### Search Examples
- **Fuzzy search**: `query: "typescript mcp"` (finds related content)
- **Exact search**: `query: "exact phrase", fuzzy: false`
- **Tag search**: `tags: ["typescript", "documentation"]`
- **Date search**: `startDate: "2024-01-01", endDate: "2024-12-31"`

## 📤 Publishing

This package is published to NPM as `@yugangcao/content-manager-mcp`. To publish a new version:

```bash
# Build the project
pnpm build

# Update version (patch/minor/major)
npm version patch

# Publish to NPM
npm publish
```

For detailed publishing instructions, see [PUBLISH_TO_NPM.md](./PUBLISH_TO_NPM.md).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and add tests
4. Ensure types are correct: `pnpm type-check`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ using TypeScript, Zod, and the latest modern tooling for robust content management.**