const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { clipboard } = require('electron');

/**
 * Pythonスクリプトの実行パスを取得
 */
function getPythonScriptPath(scriptName: string): string {
  let basePath;
  
  if (process.env.NODE_ENV === 'development') {
    // 開発環境では直接プロジェクトディレクトリ内のスクリプトを使用
    basePath = path.join(__dirname, '../../src/python');
  } else {
    // 本番環境ではアプリケーションのリソースディレクトリを使用
    if (process.platform === 'darwin') {
      // macOS
      basePath = path.join(process.resourcesPath, 'src/python');
    } else {
      // Windows & Linux
      basePath = path.join(process.resourcesPath, 'src/python');
    }
  }
  
  return path.join(basePath, scriptName);
}

/**
 * Pythonインタープリタのパスを取得
 */
function getPythonPath() {
  // 環境変数でPythonパスが設定されていればそれを使用
  if (process.env.PYTHON_PATH) {
    return process.env.PYTHON_PATH;
  }
  
  // デフォルトはシステムのPython
  return process.platform === 'win32' ? 'python' : 'python3';
}

/**
 * クリップボードに絵文字をコピー
 */
async function copyToClipboard(text: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      // Electronのクリップボード機能を使用
      clipboard.writeText(text);
      console.log(`絵文字 "${text}" をクリップボードにコピーしました`);
      resolve(true);
    } catch (error) {
      console.error('クリップボードコピー中に例外が発生しました:', error);
      reject(error);
    }
  });
}

module.exports = {
  copyToClipboard
};