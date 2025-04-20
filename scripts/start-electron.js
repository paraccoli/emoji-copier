const { spawn, exec } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Vite サーバーの準備ができているかチェック
function checkViteServer() {
  return new Promise((resolve, reject) => {
  // リクエストオプション
    const options = {
      hostname: 'localhost',
      port: 5173,
      path: '/index.html',  // Viteのルートディレクトリは既にsrc/rendererに設定されているため
      method: 'GET',
      timeout: 1000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        // ステータスコード200なら成功と判断
        if (res.statusCode === 200) {
          console.log('Vite server is ready - detected successful response.');
          resolve(true);
        } else {
          // 別のパスも試す
          const alternateOptions = {
            hostname: 'localhost',
            port: 5173,
            path: '/',
            method: 'GET',
            timeout: 1000
          };
          
          const altReq = http.request(alternateOptions, (altRes) => {
            if (altRes.statusCode === 200) {
              console.log('Vite server is ready - detected successful response on root path.');
              resolve(true);
            } else {
              console.log(`Vite server responded with status ${res.statusCode} for index path and ${altRes.statusCode} for root path.`);
              resolve(false);
            }
          });
          
          altReq.on('error', () => {
            console.log(`Failed to check alternate path.`);
            resolve(false);
          });
          
          altReq.end();
        }
      });
    });

    req.on('error', (err) => {
      console.log(`Vite server check error: ${err.message}`);
      // ルートパスを試してみる
      const rootOptions = {
        hostname: 'localhost',
        port: 5173,
        path: '/',
        method: 'GET',
        timeout: 1000
      };
      
      const rootReq = http.request(rootOptions, (rootRes) => {
        if (rootRes.statusCode === 200) {
          console.log('Vite server is ready on root path.');
          resolve(true);
        } else {
          resolve(false);
        }
      });
      
      rootReq.on('error', () => {
        resolve(false);
      });
      
      rootReq.end();
    });

    req.on('timeout', () => {
      console.log('Vite server request timed out');
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Electron を起動
function startElectron() {
  console.log('Starting Electron...');
  
  // Windows では npm スクリプトを実行
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'npm.cmd' : 'npm';
  
  const electronProcess = spawn(command, ['run', 'dev:electron'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      ELECTRON_IS_DEV: '1'
    },
    shell: isWindows
  });
  
  electronProcess.on('error', (err) => {
    console.error('Failed to start Electron process:', err);
  });
  
  return electronProcess;
}

// メイン関数
async function main() {
  console.log('Waiting for Vite server to be ready...');
  
  // Vite サーバーが準備できるまで待機
  let isReady = false;
  const maxAttempts = 15;
  let attempts = 0;
  
  while (!isReady && attempts < maxAttempts) {
    isReady = await checkViteServer();
    if (!isReady) {
      console.log(`Waiting for Vite server (attempt ${attempts + 1}/${maxAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
  }
  
  if (!isReady) {
    console.error('Failed to connect to Vite server after multiple attempts.');
    console.log('Please make sure Vite server is running on http://localhost:5173');
    console.log('Try starting the Vite server separately with: npm run dev:vite');
    
    // 代替アプローチとして、Electronを直接起動する
    console.log('Attempting to start Electron directly as a fallback...');
    const electronProcess = startElectron();
    
    process.on('SIGINT', () => {
      console.log('Terminating Electron process...');
      electronProcess.kill();
      process.exit();
    });
    
    return;
  }
  
  // 少し待機してからElectronを起動（サーバー準備完了から少し時間をおく）
  console.log('Vite server detected. Starting Electron in 2 seconds...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Electron 起動
  const electronProcess = startElectron();
  
  // プロセス終了時の処理
  process.on('SIGINT', () => {
    console.log('Terminating Electron process...');
    electronProcess.kill();
    process.exit();
  });
}

// スクリプト実行
main().catch(err => {
  console.error('Error in start-electron script:', err);
  process.exit(1);
});