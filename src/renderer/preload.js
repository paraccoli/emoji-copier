const { contextBridge, ipcRenderer } = require('electron');

// Emojiインターフェースの定義（TypeScriptでの型定義に対応するため）
const dummyEmoji = {
  id: 0,
  unicode: '',
  short_name: '',
  group_name: '',
  subgroup: '',
  keywords: [],
  isFavorite: false
};

/**
 * Electron IPCを安全に公開するためのプリロードスクリプト
 * レンダラープロセスからメインプロセスの機能を呼び出せるようにする
 */
contextBridge.exposeInMainWorld('api', {
  // 絵文字カテゴリ取得
  getEmojiCategories: async () => {
    return await ipcRenderer.invoke('get-emoji-categories');
  },
  
  // カテゴリ別の絵文字取得
  getEmojisByCategory: async (category) => {
    if (category === 'すべて') {
      return await ipcRenderer.invoke('get-emojis-by-category', '');
    }
    return await ipcRenderer.invoke('get-emojis-by-category', category);
  },
  
  // 絵文字検索
  searchEmojis: async (query) => {
    return await ipcRenderer.invoke('search-emojis', query);
  },
  
  // 絵文字をクリップボードにコピー
  copyEmoji: async (unicode, emojiId) => {
    return await ipcRenderer.invoke('copy-emoji', unicode, emojiId);
  },
  
  // お気に入り絵文字取得
  getFavorites: async () => {
    return await ipcRenderer.invoke('get-favorites');
  },
  
  // お気に入り追加
  addFavorite: async (emojiId) => {
    return await ipcRenderer.invoke('add-to-favorites', emojiId);
  },
  
  // お気に入り解除
  removeFavorite: async (emojiId) => {
    return await ipcRenderer.invoke('remove-from-favorites', emojiId);
  },
  
  // 最近使用した絵文字取得
  getRecentEmojis: async (limit) => {
    return await ipcRenderer.invoke('get-recent-emojis', limit);
  },
  
  // 履歴から削除
  removeFromHistory: async (emojiId) => {
    return await ipcRenderer.invoke('remove-from-history', emojiId);
  },
  
  // 履歴を全て削除
  clearHistory: async () => {
    return await ipcRenderer.invoke('clear-history');
  }
});

// デバッグ情報を表示
console.log('Preload script loaded and exposed API to renderer process');
console.log('Environment:', process.env.NODE_ENV);