/**
 * Emoji インターフェース定義
 */
export interface Emoji {
  id: number;
  unicode: string;
  short_name: string;
  group_name: string;
  subgroup: string;
  keywords: string[];
  isFavorite: boolean;
}

/**
 * Electron の IPC 通信のためのインターフェース
 * プリロードスクリプトで実際に実装され、window オブジェクトに注入される
 */
export interface ElectronAPI {
  // 絵文字関連の API
  getEmojiCategories: () => Promise<string[]>;
  getEmojisByCategory: (category: string) => Promise<Emoji[]>;
  searchEmojis: (query: string) => Promise<Emoji[]>;
  copyEmoji: (unicode: string, emojiId: number) => Promise<boolean>;
  
  // お気に入り関連の API
  getFavorites: () => Promise<Emoji[]>;
  addFavorite: (emojiId: number) => Promise<boolean>;
  removeFavorite: (emojiId: number) => Promise<boolean>;
  
  // 履歴関連の API
  getRecentEmojis: (limit?: number) => Promise<Emoji[]>;
  removeFromHistory: (emojiId: number) => Promise<boolean>;
  clearHistory: () => Promise<boolean>;
}

/**
 * window オブジェクトに API を拡張
 */
declare global {
  interface Window {
    api: ElectronAPI;
  }
}

// デバッグ用ユーティリティ
function isElectron(): boolean {
  return window && window.api !== undefined;
}

/**
 * IPC API クライアント実装
 * ウィンドウオブジェクトから API を取得し、存在しない場合はモックを提供
 */
class ApiClient {
  private readonly api: ElectronAPI;
  private readonly isElectronEnv: boolean;

  constructor() {
    this.isElectronEnv = isElectron();
    
    if (this.isElectronEnv) {
      console.log('Running in Electron environment, using IPC API');
      this.api = window.api;
    } else {
      console.log('Running in browser environment, using mock API');
      this.api = this.createMockApi();
    }
  }

  /**
   * 絵文字カテゴリの一覧を取得
   */
  async getEmojiCategories(): Promise<string[]> {
    try {
      return await this.api.getEmojiCategories();
    } catch (error) {
      console.error('カテゴリ取得エラー:', error);
      return ['スマイリーと感情', '人物とボディ', '動物と自然', '食べ物と飲み物', '旅行と場所', '活動', 'オブジェクト', '記号', 'フラグ'];
    }
  }

  /**
   * 指定したカテゴリの絵文字を取得
   */
  async getEmojisByCategory(category: string): Promise<Emoji[]> {
    try {
      return await this.api.getEmojisByCategory(category);
    } catch (error) {
      console.error(`カテゴリ ${category} の絵文字取得エラー:`, error);
      return [];
    }
  }

  /**
   * 絵文字を検索
   */
  async searchEmojis(query: string): Promise<Emoji[]> {
    try {
      return await this.api.searchEmojis(query);
    } catch (error) {
      console.error('絵文字検索エラー:', error);
      return [];
    }
  }

  /**
   * 絵文字をクリップボードにコピー
   */
  async copyEmoji(unicode: string, emojiId: number): Promise<boolean> {
    try {
      if (!this.isElectronEnv) {
        // ブラウザ環境の場合は navigator.clipboard API を使用
        await navigator.clipboard.writeText(unicode);
        return true;
      }
      return await this.api.copyEmoji(unicode, emojiId);
    } catch (error) {
      console.error('絵文字コピーエラー:', error);
      return false;
    }
  }

  /**
   * お気に入り絵文字を取得
   */
  async getFavorites(): Promise<Emoji[]> {
    try {
      return await this.api.getFavorites();
    } catch (error) {
      console.error('お気に入り取得エラー:', error);
      return [];
    }
  }

  /**
   * 絵文字をお気に入りに追加
   */
  async addFavorite(emojiId: number): Promise<boolean> {
    try {
      return await this.api.addFavorite(emojiId);
    } catch (error) {
      console.error('お気に入り追加エラー:', error);
      return false;
    }
  }

  /**
   * 絵文字をお気に入りから削除
   */
  async removeFavorite(emojiId: number): Promise<boolean> {
    try {
      return await this.api.removeFavorite(emojiId);
    } catch (error) {
      console.error('お気に入り削除エラー:', error);
      return false;
    }
  }

  /**
   * 最近使用した絵文字を取得
   */
  async getRecentEmojis(limit = 20): Promise<Emoji[]> {
    try {
      return await this.api.getRecentEmojis(limit);
    } catch (error) {
      console.error('最近使用した絵文字の取得エラー:', error);
      return [];
    }
  }

  /**
   * 履歴から特定の絵文字を削除
   */
  async removeFromHistory(emojiId: number): Promise<boolean> {
    try {
      return await this.api.removeFromHistory(emojiId);
    } catch (error) {
      console.error('履歴削除エラー:', error);
      return false;
    }
  }
  
  /**
   * 履歴を全て削除
   */
  async clearHistory(): Promise<boolean> {
    try {
      return await this.api.clearHistory();
    } catch (error) {
      console.error('履歴全削除エラー:', error);
      return false;
    }
  }

  /**
   * 開発用モック API 作成
   */
  createMockApi(): ElectronAPI {
    // モック用の絵文字データ
    const mockEmojis: Emoji[] = [
      { id: 1, unicode: '😀', short_name: '笑顔', group_name: 'スマイリーと感情', subgroup: 'face-smiling', keywords: ['笑顔', '笑う', 'スマイル'], isFavorite: false },
      { id: 2, unicode: '😂', short_name: '喜び泣き', group_name: 'スマイリーと感情', subgroup: 'face-smiling', keywords: ['笑う', '嬉しい', '涙'], isFavorite: true },
      { id: 3, unicode: '❤️', short_name: 'ハート', group_name: 'スマイリーと感情', subgroup: 'heart', keywords: ['愛', '恋愛', 'ラブ'], isFavorite: false },
    ];
    
    // モック用のお気に入り
    const mockFavorites = mockEmojis.filter(e => e.isFavorite);
    
    // モック用の履歴
    const mockHistory = [
      { emojiId: 1, timestamp: new Date() },
      { emojiId: 3, timestamp: new Date(Date.now() - 60000) }, // 1分前
    ];

    return {
      getEmojiCategories: () => Promise.resolve(['すべて', 'スマイリーと感情', '人物とボディ', '動物と自然', '食べ物と飲み物', '旅行と場所', '活動', 'オブジェクト', '記号', 'フラグ']),
      
      getEmojisByCategory: (category) => {
        if (!category || category === 'すべて') {
          return Promise.resolve(mockEmojis);
        }
        return Promise.resolve(mockEmojis.filter(e => e.group_name === category));
      },
      
      searchEmojis: (query) => {
        const lowerQuery = query.toLowerCase();
        return Promise.resolve(
          mockEmojis.filter(e => 
            e.short_name.toLowerCase().includes(lowerQuery) || 
            e.keywords.some(k => k.toLowerCase().includes(lowerQuery))
          )
        );
      },
      
      copyEmoji: (unicode, emojiId) => {
        mockHistory.unshift({ emojiId, timestamp: new Date() });
        console.log(`Copied emoji: ${unicode} (ID: ${emojiId})`);
        return Promise.resolve(true);
      },
      
      getFavorites: () => {
        return Promise.resolve(mockFavorites);
      },
      
      addFavorite: (emojiId) => {
        const emoji = mockEmojis.find(e => e.id === emojiId);
        if (emoji) {
          emoji.isFavorite = true;
          mockFavorites.push(emoji);
        }
        return Promise.resolve(true);
      },
      
      removeFavorite: (emojiId) => {
        const index = mockFavorites.findIndex(e => e.id === emojiId);
        if (index >= 0) {
          mockFavorites.splice(index, 1);
          const emoji = mockEmojis.find(e => e.id === emojiId);
          if (emoji) {
            emoji.isFavorite = false;
          }
        }
        return Promise.resolve(true);
      },
      
      getRecentEmojis: (limit = 3) => {
        const recentEmojiIds = mockHistory
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .map(h => h.emojiId)
          .slice(0, limit);
          
        const recentEmojis = recentEmojiIds
          .map(id => mockEmojis.find(e => e.id === id))
          .filter(Boolean) as Emoji[];
          
        return Promise.resolve(recentEmojis);
      },
      
      removeFromHistory: (emojiId) => {
        const index = mockHistory.findIndex(h => h.emojiId === emojiId);
        if (index >= 0) {
          mockHistory.splice(index, 1);
        }
        return Promise.resolve(true);
      },
      
      clearHistory: () => {
        mockHistory.length = 0;
        return Promise.resolve(true);
      }
    };
  }
}

// API クライアントのシングルトンインスタンスをエクスポート
export const apiClient = new ApiClient();