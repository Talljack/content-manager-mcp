# 📦 发布到 NPM 指南

## 如何将我们的 MCP 服务器发布为 NPM 包

### 1. 准备发布

```bash
# 更新 package.json 添加 bin 字段
```

```json
{
  "name": "@yugangcao/content-manager-mcp",
  "version": "1.0.0",
  "main": "dist/index.js",
  "bin": {
    "content-manager-mcp": "dist/index.js"
  },
  "files": [
    "dist",
    "README.md"
  ],
  "publishConfig": {
    "access": "public"
  }
}
```

### 2. 构建和发布

```bash
# 构建项目
pnpm build

# 登录 NPM (如果没有登录过)
npm login

# 发布包
npm publish
```

### 3. 发布后的使用方式

其他用户就可以这样使用：

```bash
# 在 Claude Desktop 配置中
npx -y @yugangcao/content-manager-mcp

# 或者在 Cherry Studio 中
命令: npx
参数: ["-y", "@yugangcao/content-manager-mcp"]
```

### 4. 优势

- ✅ 其他人容易安装和使用
- ✅ 版本管理更简单
- ✅ 跨平台兼容
- ✅ 自动依赖管理