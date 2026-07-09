/**
 * vite.config.js — 인사톡 노무톡 Vite 설정 (Phase 5)
 * 
 * 하이브리드 모드:
 * - 기존 44개 <script> 는 그대로 (레거시)
 * - ES Modules(admin/js/modules/*.mjs) 는 Vite가 번들링
 * - 개발 서버는 Express 백엔드에 프록시
 */
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // 다중 진입점
  build: {
    rollupOptions: {
      input: {
        'admin-modules': path.resolve(__dirname, 'admin/js/modules/main.mjs'),
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },

  // 개발 서버 설정 (Express 백엔드 프록시)
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/tables': 'http://localhost:3000',
      '/admin': 'http://localhost:3000',
      '/client': 'http://localhost:3000',
    },
  },

  // 경로 별칭
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'admin/js/modules'),
    },
  },
});
