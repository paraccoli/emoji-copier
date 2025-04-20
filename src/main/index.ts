import { app, BrowserWindow, ipcMain, shell, dialog, clipboard, IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { 
  initializeDB, getEmojis, searchEmojis, getFavorites, 
  addToFavorites, removeFromFavorites, addToHistory, getRecentEmojis,
  removeFromHistory, clearHistory,
  Emoji
} from './db';

// アプリケーションのメタデータ
const APP_NAME = 'Emoji Copier';
const APP_VERSION = '1.0.0';

// 開発モードかどうかの判定
const isDev = process.env.NODE_ENV === 'development';

// メインウィンドウの参照を保持（GCを防止）
let mainWindow = null;

/**
 * メインウィンドウの作成
 */
async function createMainWindow() {
  console.log('Creating main window...');
  
  // プリロードスクリプトのパス
  const preloadPath = path.join(__dirname, '../../src/renderer/preload.js');
  console.log('Preload script path:', preloadPath);
  
  // ウィンドウ作成
  const win = new BrowserWindow({
    width: 900,
    height: 680,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: !isDev  // 開発モードではWebSecurityを無効化
    },
    title: APP_NAME,
    show: false  // 準備ができるまで表示しない
  });
  
  // ウィンドウが準備できたら表示
  win.once('ready-to-show', () => {
    console.log('Window is ready to show');
    win.show();
  });
    try {
    if (isDev) {
      console.log('Loading from Vite development server...');
      // 開発モードでは直接Viteサーバーを使用
      const viteServerUrl = 'http://localhost:5173';
      console.log(`Trying to connect to Vite server at: ${viteServerUrl}`);
      
      // Viteサーバーへの接続をデバッグする
      try {
        // 事前にViteサーバーの状態を確認
        await win.loadURL(viteServerUrl);
        console.log('Successfully loaded from Vite server');
      } catch (devError) {
        console.error('Failed to load from Vite server:', devError);
        
        // フォールバック1: 別のパスでViteサーバーを試す
        try {
          const altViteUrl = 'http://localhost:5173/src/renderer/';
          console.log(`Trying alternate Vite path: ${altViteUrl}`);
          await win.loadURL(altViteUrl);
          console.log('Successfully loaded from alternate Vite path');
        } catch (altError) {
          console.error('Failed to load from alternate Vite path:', altError);
          
          // フォールバック2: index.htmlをファイルシステムから直接読み込む
          try {
            const directHtmlPath = path.join(__dirname, '../../src/renderer/index.html');
            console.log(`Trying to load HTML directly from: ${directHtmlPath}`);
            await win.loadFile(directHtmlPath);
            console.log('Successfully loaded HTML directly from file system');
          } catch (htmlError) {
            console.error('Failed to load HTML directly:', htmlError);
            throw htmlError;
          }
        }
      }
      
      // 開発者ツールを開く
      win.webContents.openDevTools();
      console.log('DevTools opened');
    } else {
      console.log('Loading from built files...');
      // 本番環境ではビルドされたファイルを使用
      const htmlPath = path.join(__dirname, '../../dist/renderer/index.html');
      console.log('Loading HTML from:', htmlPath);
      await win.loadFile(htmlPath);
      console.log('Successfully loaded production build');
    }
  } catch (error) {
    console.error('Window load error:', error);
    
    try {
      // 最終的なフォールバック: bridge.htmlを使用
      console.log('Attempting to load bridge HTML...');
      const bridgeHtmlPath = path.join(__dirname, '../../src/renderer/bridge.html');
      console.log('Bridge HTML path:', bridgeHtmlPath);
      
      if (fs.existsSync(bridgeHtmlPath)) {
        await win.loadFile(bridgeHtmlPath);
        console.log('Successfully loaded bridge HTML');
      } else {
        console.error('Bridge HTML not found at:', bridgeHtmlPath);
        dialog.showErrorBox(
          'アプリケーション読み込みエラー',
          `ブリッジHTMLファイルが見つかりませんでした: ${bridgeHtmlPath}`
        );
      }    } catch (secondError) {
      console.error('Failed to load bridge HTML:', secondError);
      dialog.showErrorBox(
        'アプリケーション読み込みエラー',
        'アプリケーションの読み込み中にエラーが発生しました。\n' + 
        (secondError instanceof Error ? secondError.message : String(secondError))
      );
    }
  }
  // DevToolsでのネットワークエラーを抑制
  win.webContents.on('console-message', (_event, _level, message) => {
    if (message.includes('Failed to load resource') || message.includes('ERR_CONNECTION_REFUSED')) {
      return; // これらのエラーは無視
    }
    console.log(`[Renderer Console]`, message);
  });
  
  return win;
}

/**
 * データベースの初期化とIPC通信の設定
 */
function setupIPC() {  // 絵文字カテゴリーの取得
  ipcMain.handle('get-emoji-categories', async () => {
    try {
      // カテゴリーのリストを返す
      return [
        'すべて',
        'スマイリーと感情', 
        '人と体', 
        '動物と自然', 
        '飲み物と食べ物',
        '旅行と場所', 
        '活動', 
        '物', 
        '記号', 
        '旗'
      ];
    } catch (error) {
      console.error('カテゴリー取得エラー:', error);
      return [];
    }
  });

  // カテゴリー別の絵文字取得
  ipcMain.handle('get-emojis-by-category', async (_, category: string) => {
    try {
      return getEmojis(category);
    } catch (error) {
      console.error(`カテゴリー ${category} の絵文字取得エラー:`, error);
      return [];
    }
  });
  
  // 絵文字検索
  ipcMain.handle('search-emojis', async (_, query: string) => {
    try {
      return searchEmojis(query);
    } catch (error) {
      console.error('絵文字検索エラー:', error);
      return [];
    }
  });
  
  // 絵文字をクリップボードにコピー
  ipcMain.handle('copy-emoji', async (_, unicode: string, emojiId: number) => {
    try {
      clipboard.writeText(unicode);
      console.log(`絵文字 "${unicode}" (ID: ${emojiId}) をコピーしました`);
      await addToHistory(emojiId);
      return true;
    } catch (error) {
      console.error('クリップボードへのコピーエラー:', error);
      return false;
    }
  });
  
  // お気に入り絵文字を取得
  ipcMain.handle('get-favorites', async () => {
    try {
      return getFavorites();
    } catch (error) {
      console.error('お気に入り取得エラー:', error);
      return [];
    }
  });
  
  // 絵文字をお気に入りに追加
  ipcMain.handle('add-to-favorites', async (_, emojiId: number) => {
    try {
      return addToFavorites(emojiId);
    } catch (error) {
      console.error('お気に入り追加エラー:', error);
      return false;
    }
  });
  
  // 絵文字をお気に入りから削除
  ipcMain.handle('remove-from-favorites', async (_, emojiId: number) => {
    try {
      return removeFromFavorites(emojiId);
    } catch (error) {
      console.error('お気に入り削除エラー:', error);
      return false;
    }
  });
  
  // 最近使用した絵文字を取得
  ipcMain.handle('get-recent-emojis', async (_, limit: number = 20) => {
    try {
      return getRecentEmojis(limit);
    } catch (error) {
      console.error('最近使用した絵文字の取得エラー:', error);
      return [];
    }
  });

  // 履歴から特定の絵文字を削除するハンドラー
  ipcMain.handle('remove-from-history', async (_, emojiId) => {
    try {
      return removeFromHistory(emojiId);
    } catch (error) {
      console.error('履歴削除エラー:', error);
      return false;
    }
  });

  // 履歴を全て削除するハンドラー
  ipcMain.handle('clear-history', async () => {
    try {
      return clearHistory();
    } catch (error) {
      console.error('履歴全削除エラー:', error);
      return false;
    }
  });
}

/**
 * アプリケーションの起動処理
 */
async function main() {
  try {
    // データベースの初期化
    try {
      await initializeDB();
    } catch (dbError) {
      console.error('データベース初期化エラー:', dbError);
      // データベース初期化エラーだけではアプリを終了させない
      // インメモリデータを使用する
    }
    
    // IPC通信のセットアップ
    setupIPC();
    
    // Electronの準備完了時の処理
    app.whenReady().then(async () => {
      try {
        mainWindow = await createMainWindow();
        
        app.on('activate', async () => {
          // macOSでドックアイコンクリック時にウィンドウがなければ再作成
          if (BrowserWindow.getAllWindows().length === 0) {
            mainWindow = await createMainWindow();
          }
        });
      } catch (error) {
        console.error('ウィンドウ作成エラー:', error);
        dialog.showErrorBox(
          'アプリケーション起動エラー',
          'ウィンドウの作成中にエラーが発生しました。\n' + (error instanceof Error ? error.message : String(error))
        );
        app.exit(1);
      }
    });
    
    // すべてのウィンドウが閉じられたときの処理
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
    
  } catch (error) {
    console.error('アプリケーション起動中にエラーが発生しました:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    dialog.showErrorBox('起動エラー', '予期しないエラーが発生しました。\n' + errorMessage);
    app.exit(1);
  }
}

// アプリケーションの実行
main();