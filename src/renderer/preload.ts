import { contextBridge, ipcRenderer } from 'electron';
import { Emoji } from '../main/db';

/**
 * Electron IPCを安全に公開するためのプリロードスクリプト
 * レンダラープロセスからメインプロセスの機能を呼び出せるようにする
 */
contextBridge.exposeInMainWorld('api', {
  // 絵文字カテゴリ取得
  getEmojiCategories: async (): Promise<string[]> => {
    return await ipcRenderer.invoke('get-emoji-categories');
  },
  
  // カテゴリ別の絵文字取得
  getEmojisByCategory: async (category: string): Promise<Emoji[]> => {
    if (category === 'すべて') {
      return await ipcRenderer.invoke('get-emojis-by-category', '');
    }
    return await ipcRenderer.invoke('get-emojis-by-category', category);
  },
  
  // 絵文字検索
  searchEmojis: async (query: string): Promise<Emoji[]> => {
    return await ipcRenderer.invoke('search-emojis', query);
  },
  
  // 絵文字をクリップボードにコピー
  copyEmoji: async (unicode: string, emojiId: number): Promise<boolean> => {
    return await ipcRenderer.invoke('copy-emoji', unicode, emojiId);
  },
  
  // お気に入り絵文字取得
  getFavorites: async (): Promise<Emoji[]> => {
    return await ipcRenderer.invoke('get-favorites');
  },
  
  // お気に入り追加
  addFavorite: async (emojiId: number): Promise<boolean> => {
    return await ipcRenderer.invoke('add-to-favorites', emojiId);
  },
  
  // お気に入り解除
  removeFavorite: async (emojiId: number): Promise<boolean> => {
    return await ipcRenderer.invoke('remove-from-favorites', emojiId);
  },
  
  // 最近使用した絵文字取得
  getRecentEmojis: async (limit?: number): Promise<Emoji[]> => {
    return await ipcRenderer.invoke('get-recent-emojis', limit);
  },
  
  // 履歴から削除
  removeFromHistory: async (emojiId: number): Promise<boolean> => {
    return await ipcRenderer.invoke('remove-from-history', emojiId);
  },
  
  // 履歴を全て削除
  clearHistory: async (): Promise<boolean> => {
    return await ipcRenderer.invoke('clear-history');
  }
});

// プリロードスクリプトが読み込まれたことをコンソールに表示
console.log('Preload script loaded');