import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'node20',
  outDir: 'dist',
  treeshake: true,
  minify: false, // 保持代码可读性，便于调试
  external: [
    // 排除 Node.js 内置模块
    'fs',
    'path',
    'url',
    'util',
    'events',
    'stream',
    'buffer',
    'crypto',
    'os',
    'child_process'
  ],
  onSuccess: async () => {
    console.log('✅ Build completed successfully!');
  }
});