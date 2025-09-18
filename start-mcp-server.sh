#!/bin/bash

# Content Manager MCP Server 启动脚本
# 可用于各种 MCP 客户端

SERVER_PATH="/Users/yugangcao/apps/my-apps/content-manager-mcp/dist/index.js"
PROJECT_DIR="/Users/yugangcao/apps/my-apps/content-manager-mcp"

echo "🚀 启动 Content Manager MCP Server..."
echo "📍 服务器路径: $SERVER_PATH"
echo "📂 项目目录: $PROJECT_DIR"
echo ""

# 检查文件是否存在
if [ ! -f "$SERVER_PATH" ]; then
    echo "❌ 服务器文件不存在，正在构建..."
    cd "$PROJECT_DIR" && pnpm build
fi

# 检查 Node.js 版本
NODE_VERSION=$(node --version)
echo "🟢 Node.js 版本: $NODE_VERSION"

# 启动服务器
echo "🔄 启动 MCP 服务器..."
node "$SERVER_PATH"