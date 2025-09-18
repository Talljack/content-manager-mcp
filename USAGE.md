# Content Manager MCP Server 使用指南

## 🎯 使用场景

这个 MCP Server 主要用于与 AI 客户端（如 Claude Desktop, Cursor, 等）集成，为 AI 提供内容管理能力。

## 📋 使用方式

### 1. 与 Claude Desktop 集成

#### 步骤 1: 构建项目
```bash
cd /Users/yugangcao/apps/my-apps/content-manager-mcp
pnpm build
```

#### 步骤 2: 配置 Claude Desktop
在你的 Claude Desktop 配置文件中添加（通常位于 `~/Library/Application Support/Claude/claude_desktop_config.json`）：

```json
{
  "mcpServers": {
    "content-manager": {
      "command": "node",
      "args": ["/Users/yugangcao/apps/my-apps/content-manager-mcp/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

#### 步骤 3: 重启 Claude Desktop
重启应用后，Claude 就可以使用这些内容管理工具了。

### 2. 实际使用示例

一旦配置好，你可以向 Claude 提出这样的请求：

#### 📝 Markdown 处理
```
"帮我将这段 markdown 转换为 HTML：
# 我的文档
这是一个**重要**的文档。
## 章节1
内容..."
```

#### 🔍 搜索功能
```
"在我的笔记目录 /Users/yugangcao/Documents/notes 中搜索包含 'TypeScript' 的文件"
```

#### 📊 内容分析
```
"分析我的文档目录的统计信息，看看有多少个文件，总大小是多少"
```

#### 🏷️ 标签搜索
```
"找出所有标记为 'tutorial' 和 'javascript' 的文档"
```

### 3. 开发模式使用

在开发过程中，你可以使用监视模式：

```bash
# 开发模式 - 代码变化时自动重启
pnpm dev
```

### 4. 创建你自己的笔记目录

让我们创建一个示例笔记目录来测试：

```bash
# 创建笔记目录
mkdir -p ~/my-notes
cd ~/my-notes

# 创建示例笔记
echo "---
title: 学习 TypeScript
tags: [typescript, programming, learning]
date: 2024-01-15
---

# TypeScript 学习笔记

这是我学习 TypeScript 的笔记。

## 基础概念

TypeScript 是 JavaScript 的超集...
" > typescript-notes.md

echo "---
title: React 项目总结
tags: [react, frontend, project]
date: 2024-01-20
---

# React 项目开发总结

最近完成了一个 React 项目...
" > react-project.md
```

然后你就可以告诉 Claude：
```
"搜索我的 ~/my-notes 目录中关于 'TypeScript' 的笔记"
```

## 🛠 高级使用技巧

### 1. 批量处理
```
"分析我整个文档目录的结构，然后为所有 markdown 文件生成目录"
```

### 2. 内容整理
```
"找出所有没有标签的 markdown 文件，帮我根据内容建议适当的标签"
```

### 3. 文档维护
```
"列出最近 30 天内修改的所有文档"
```

## 🔧 故障排除

### 问题：Claude 找不到 MCP Server
**解决方案**：
1. 确保路径正确
2. 检查 `dist/index.js` 文件是否存在
3. 重启 Claude Desktop

### 问题：权限错误
**解决方案**：
```bash
chmod +x dist/index.js
```

### 问题：Node.js 版本
确保你的 Node.js 版本 >= 20.0.0：
```bash
node --version
```

## 📈 性能优化建议

1. **大量文件搜索**：使用 `maxResults` 参数限制结果数量
2. **内容预览**：设置 `includeContent: false` 可以更快获取文件列表
3. **目录限制**：指定具体目录而不是搜索整个文件系统

## 🎨 扩展想法

你可以基于这个项目扩展更多功能：

1. **PDF 处理**：添加 PDF 文件的文本提取
2. **图片分析**：集成 OCR 功能处理图片中的文字
3. **数据库集成**：将笔记元数据存储到数据库
4. **Git 集成**：跟踪文档的版本变化
5. **模板系统**：为不同类型的文档提供模板

现在你已经有了一个功能完整的内容管理 MCP Server，可以开始用它来增强你的 AI 工作流了！