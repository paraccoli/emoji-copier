// Electron エントリーポイント
const { app } = require('electron');
const path = require('path');

// アプリケーションに関するロギング
console.log('Starting emoji-copier application...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Working directory:', process.cwd());

// 開発モードかどうかの判定
const isDev = process.env.NODE_ENV === 'development';
console.log('Development mode:', isDev);

// 開発モードではホットリロードを有効化
if (isDev) {
  try {
    require('electron-reloader')(module, {
      debug: true,
      watchRenderer: true
    });
    console.log('Electron reloader enabled');
  } catch (err) {
    console.error('Error setting up electron-reloader:', err);
  }
}

// ts-nodeの設定
if (isDev) {
  try {
    // ESMとしてTypeScriptを読み込むための設定
    require('ts-node').register({
      transpileOnly: true,
      compilerOptions: {
        module: 'CommonJS',
        target: 'es2021',
        esModuleInterop: true
      }
    });
    console.log('ts-node registered successfully');
  } catch (err) {
    console.error('Error setting up ts-node:', err);
  }
}

// メインモジュールを読み込む
let mainPath;

if (isDev) {
  // 開発モードでは直接ソースファイルを使用
  mainPath = './src/main/index.ts';
} else {
  // 本番モードではビルド済みファイルを使用（パス解決方法を改善）
  try {
    // 最初に.viteフォルダ内のパスを試みる
    const viteMainPath = './.vite/build/main.js';
    require.resolve(viteMainPath);
    mainPath = viteMainPath;
  } catch (err) {
    // 失敗した場合はdistディレクトリを試みる
    try {
      const distMainPath = './dist/main/index.js';
      require.resolve(distMainPath);
      mainPath = distMainPath;
    } catch (err2) {
      // さらに失敗した場合は直接ビルドディレクトリを試みる
      mainPath = './build/main.js';
    }
  }
}

console.log('Loading main module from:', mainPath);

try {
  // メインプロセスを実行
  require(mainPath);
} catch (err) {
  console.error('Failed to load main module:', err);
  app.quit();
}