import { defineConfig } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Tailwind CSSのユーティリティクラスを持つJSX要素に対する最適化を有効化
      babel: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
        ]
      }
    }),
    tsconfigPaths()
  ],
  base: './', // 相対パスで動作するように設定
  root: path.join(__dirname, 'src/renderer'), // Rendererディレクトリをルートとして指定
  publicDir: path.join(__dirname, 'src/renderer/public'), // 静的ファイル
  build: {
    outDir: path.join(__dirname, 'dist/renderer'), // ビルド出力ディレクトリ
    emptyOutDir: true,
    target: 'es2021', // Electronが対応するバージョンに合わせる
    minify: process.env.MODE === 'development' ? false : 'esbuild',
    sourcemap: process.env.MODE === 'development'
  },
  server: {
    port: 5173, // 開発サーバーのポート
    strictPort: true, // 指定したポートが使用中の場合はエラー
    host: 'localhost', // ローカルホストに制限
    fs: {
      strict: true,
    },
    hmr: {
      overlay: true
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@main': path.resolve(__dirname, './src/main'),
      '@renderer': path.resolve(__dirname, './src/renderer/src'),
      '@components': path.resolve(__dirname, './src/renderer/src/components'),
      '@styles': path.resolve(__dirname, './src/renderer/src/styles'),
      '@assets': path.resolve(__dirname, './src/renderer/src/assets'),
    },
  },
  // Electronプロジェクト向けの最適化
  optimizeDeps: {
    exclude: ['electron'],
  },
  // メインプロセスとレンダラープロセスの通信設定
  define: {
    'process.env': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV),
    },
  },
});