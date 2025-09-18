---
title: Advanced Content Management Features
tags: [advanced, content-management, search, markdown]
author: Content Manager
date: 2024-01-20
category: advanced
priority: high
---

# Advanced Content Management Features

This note covers advanced features of the Content Manager MCP Server.

## Intelligent Search

The search system uses Fuse.js for fuzzy matching with configurable options:

- **Threshold**: Controls search strictness (0.0 = exact, 1.0 = very loose)
- **Keys**: Weighted search across filename, content, and frontmatter
- **Match highlighting**: Shows where matches occur in content

## Content Analysis

### Directory Statistics
Get insights into your content collection:

```json
{
  "totalFiles": 42,
  "totalSize": 125000,
  "fileTypes": {
    ".md": 38,
    ".txt": 4
  },
  "averageFileSize": 2976
}
```

### Frontmatter Parsing
Supports rich metadata in YAML format:

- **Strings**: `title: "My Document"`
- **Arrays**: `tags: [tag1, tag2, tag3]`
- **Dates**: `date: 2024-01-20`
- **Booleans**: `published: true`
- **Numbers**: `priority: 5`

## Performance Considerations

- **Lazy loading**: Files are only read when needed
- **Efficient search**: Fuse.js provides fast fuzzy search
- **Type safety**: Zod validation ensures data integrity
- **Error handling**: Graceful degradation for invalid files

## Integration Tips

1. Use appropriate search parameters for your use case
2. Leverage tags for better content organization  
3. Consider file size when processing large collections
4. Monitor search performance with large datasets