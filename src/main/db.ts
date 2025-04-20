import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// データベースライブラリを安全に読み込む
function loadSqlite() {
  try {
    return require('better-sqlite3');
  } catch (error) {
    console.error('better-sqlite3 の読み込みに失敗しました:', error);
    // インメモリデータベースの使用を示すログメッセージ
    console.warn('インメモリデータを使用します。データベース機能は制限されます。');
    return null;
  }
}

const sqlite = loadSqlite();

// インターフェースの定義
export interface Emoji {
  id: number;
  unicode: string;
  short_name: string;
  group_name: string;
  subgroup: string;
  keywords: string[];
  isFavorite: boolean;
}

export interface HistoryItem {
  emojiId: number;
  usedAt: string;
}

// データベースファイルのパス
let dbPath: string;

// 環境変数からDBパスを取得、または適切な場所を設定
if (process.env.DATABASE_PATH) {
  dbPath = path.resolve(process.env.DATABASE_PATH);
} else {
  // デフォルトのパス
  const dataDir = process.platform === 'win32'
    ? path.join(process.env.APPDATA || '', 'emoji-copier')
    : path.join(os.homedir(), '.local', 'share', 'emoji-copier');
  
  dbPath = path.join(dataDir, 'data', 'emojis.db');
  
  // 開発モード時は現在のディレクトリ内のデータを使用
  if (process.env.NODE_ENV === 'development') {
    dbPath = path.join(__dirname, '../../data/emojis.db');
  }
}

// データベース接続
let db: any;

// インメモリデータの型定義
interface InMemoryData {
  emojis: Emoji[];
  favorites: number[];
  history: HistoryItem[];
}

// インメモリデータの準備
const inMemoryData: InMemoryData = {
  emojis: [
    { id: 1, unicode: '😀', short_name: '笑顔', group_name: '顔と感情', subgroup: '顔', keywords: ['笑顔', 'スマイル'], isFavorite: false },
    { id: 2, unicode: '😊', short_name: 'にっこり', group_name: '顔と感情', subgroup: '顔', keywords: ['笑顔', '幸せ'], isFavorite: false },
    { id: 3, unicode: '🐱', short_name: '猫', group_name: '動物と自然', subgroup: '動物', keywords: ['猫', 'ねこ', 'ペット'], isFavorite: false },
    { id: 4, unicode: '🍎', short_name: 'りんご', group_name: '食べ物と飲み物', subgroup: '食べ物', keywords: ['りんご', 'フルーツ'], isFavorite: false },
    { id: 5, unicode: '🚗', short_name: '車', group_name: '旅行と場所', subgroup: '乗り物', keywords: ['車', '自動車', '運転'], isFavorite: false }
  ],
  favorites: [],
  history: []
};

/**
 * データベースの初期化
 */
async function initializeDB(): Promise<void> {
  try {
    // SQLite が利用できない場合はインメモリデータを使用
    if (!sqlite) {
      console.log('インメモリデータベースを使用します');
      return;
    }

    // データベースファイルがあることを確認
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // 既存DBに接続
    if (fs.existsSync(dbPath)) {
      try {
        db = sqlite(dbPath);
        console.log(`データベースに接続しました: ${dbPath}`);
        return;
      } catch (error) {
        console.error('データベース接続エラー:', error);
        // 接続に失敗した場合はインメモリデータを使用
        console.warn('インメモリデータを使用します');
        return;
      }
    }
    
    // データベースが存在しない場合、開発環境のDBをコピー
    if (process.env.NODE_ENV === 'development') {
      const defaultDbPath = path.join(__dirname, '../../data/emojis.db');
      if (fs.existsSync(defaultDbPath)) {
        try {
          fs.copyFileSync(defaultDbPath, dbPath);
          db = sqlite(dbPath);
          console.log(`開発用データベースをコピーしました: ${defaultDbPath} → ${dbPath}`);
          return;
        } catch (error) {
          console.error('データベースコピーエラー:', error);
          // コピーに失敗した場合はインメモリデータを使用
          console.warn('インメモリデータを使用します');
          return;
        }
      }
    }
    
    // どこにもDBがなければインメモリデータを使用
    console.warn('データベースファイルが見つかりません。インメモリデータを使用します。');
    
  } catch (error) {
    console.error('データベース初期化エラー:', error);
    console.warn('インメモリデータを使用します');
  }
}

/**
 * カテゴリ別の絵文字を取得
 */
function getEmojis(category: string): Emoji[] {
  try {
    // SQLite が使用できない場合はインメモリデータを使用
    if (!sqlite || !db) {
      if (category) {
        return inMemoryData.emojis.filter(e => e.group_name === category);
      }
      return inMemoryData.emojis;
    }

  // SQLite を使用
    let query = `
      SELECT e.id, e.unicode, e.short_name, e.group_name, e.subgroup,
             GROUP_CONCAT(k.keyword) as keywords_str,
             EXISTS(SELECT 1 FROM favorites WHERE emoji_id = e.id) as isFavorite
      FROM emojis e
      LEFT JOIN emoji_keywords ek ON e.id = ek.emoji_id
      LEFT JOIN keywords k ON ek.keyword_id = k.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (category) {
      query += ` AND e.group_name = ?`;
      params.push(category);
    }
    
    query += ` GROUP BY e.id ORDER BY e.short_name COLLATE NOCASE ASC`;
    
    const results = db.prepare(query).all(params);
    
    // キーワード文字列を配列に変換
    return results.map((row: any) => ({
      ...row,
      keywords: row.keywords_str ? row.keywords_str.split(',') : [],
      isFavorite: Boolean(row.isFavorite)
    }));
    
  } catch (error) {
    console.error('絵文字取得エラー:', error);
    // エラー時はインメモリデータを返す
    if (category) {
      return inMemoryData.emojis.filter(e => e.group_name === category);
    }
    return inMemoryData.emojis;
  }
}

/**
 * 絵文字を検索
 */
function searchEmojis(query: string): Emoji[] {
  try {
    // SQLite が使用できない場合はインメモリデータを使用
    if (!sqlite || !db) {
      if (!query.trim()) return [];
      
      const searchTerms = query.trim().toLowerCase().split(/\s+/);
      return inMemoryData.emojis.filter(emoji => 
        searchTerms.every(term => 
          emoji.short_name.toLowerCase().includes(term) || 
          emoji.keywords.some(k => k.toLowerCase().includes(term))
        )
      );
    }

    // SQLite を使用
    const searchTerms = query.trim().toLowerCase().split(/\s+/);
    
    // 検索クエリが空の場合は空の配列を返す
    if (searchTerms.length === 0 || searchTerms[0] === '') {
      return [];
    }
      let sql = `
      SELECT e.id, e.unicode, e.short_name, e.group_name, e.subgroup, 
             GROUP_CONCAT(k.keyword) as keywords_str,
             EXISTS(SELECT 1 FROM favorites WHERE emoji_id = e.id) as isFavorite
      FROM emojis e
      LEFT JOIN emoji_keywords ek ON e.id = ek.emoji_id
      LEFT JOIN keywords k ON ek.keyword_id = k.id
    `;
    
    // 各検索ワードに対する条件
    const conditions: string[] = [];
    const params: any[] = [];
    
    // 検索条件の構築
    const whereClause: string[] = [];
    
    for (const term of searchTerms) {
      whereClause.push(`(
        LOWER(e.short_name) LIKE ? 
        OR LOWER(k.keyword) LIKE ?
      )`);
      params.push(`%${term}%`, `%${term}%`);
    }
    
    if (whereClause.length > 0) {
      sql += ` WHERE ${whereClause.join(' AND ')}`;
    }
    
    sql += ' GROUP BY e.id ORDER BY e.short_name COLLATE NOCASE ASC';
    
    const results = db.prepare(sql).all(params);
    
    return results.map((row: any) => ({
      ...row,
      keywords: row.keywords ? JSON.parse(row.keywords) : [],
      isFavorite: Boolean(row.isFavorite)
    }));
    
  } catch (error) {
    console.error('絵文字検索エラー:', error);
    // エラー時はインメモリデータで検索
    if (!query.trim()) return [];
    
    const searchTerms = query.trim().toLowerCase().split(/\s+/);
    return inMemoryData.emojis.filter(emoji => 
      searchTerms.every(term => 
        emoji.short_name.toLowerCase().includes(term) || 
        emoji.keywords.some(k => k.toLowerCase().includes(term))
      )
    );
  }
}

/**
 * お気に入りの絵文字を取得
 */
function getFavorites(): Emoji[] {
  try {
    // SQLite が使用できない場合はインメモリデータを使用
    if (!sqlite || !db) {
      return inMemoryData.emojis.filter(e => e.isFavorite);
    }    // SQLite を使用
    const query = `
      SELECT e.id, e.unicode, e.short_name, e.group_name, e.subgroup, 
             GROUP_CONCAT(k.keyword) as keywords_str, 
             1 as isFavorite
      FROM emojis e
      JOIN favorites f ON e.id = f.emoji_id
      LEFT JOIN emoji_keywords ek ON e.id = ek.emoji_id
      LEFT JOIN keywords k ON ek.keyword_id = k.id
      GROUP BY e.id
      ORDER BY f.created_at DESC
    `;
    
    const results = db.prepare(query).all();
    
    return results.map((row: any) => ({
      ...row,
      keywords: row.keywords_str ? row.keywords_str.split(',') : [],
      isFavorite: true
    }));
    
  } catch (error) {
    console.error('お気に入り取得エラー:', error);
    return inMemoryData.emojis.filter(e => e.isFavorite);
  }
}

/**
 * お気に入りに絵文字を追加
 */
function addToFavorites(emojiId: number): boolean {
  try {
    // SQLite が使用できない場合はインメモリデータを使用
    if (!sqlite || !db) {
      const emoji = inMemoryData.emojis.find(e => e.id === emojiId);
      if (emoji) {
        emoji.isFavorite = true;
        return true;
      }
      return false;
    }

  // SQLite を使用
    const now = new Date().toISOString();
    
    const result = db.prepare('INSERT OR REPLACE INTO favorites (emoji_id, created_at) VALUES (?, ?)').run(emojiId, now);
    
    return result.changes > 0;
  } catch (error) {
    console.error('お気に入り追加エラー:', error);
    // エラー時はインメモリデータを操作
    const emoji = inMemoryData.emojis.find(e => e.id === emojiId);
    if (emoji) {
      emoji.isFavorite = true;
      return true;
    }
    return false;
  }
}

/**
 * お気に入りから絵文字を削除
 */
function removeFromFavorites(emojiId: number): boolean {
  try {
    // SQLite が使用できない場合はインメモリデータを使用
    if (!sqlite || !db) {
      const emoji = inMemoryData.emojis.find(e => e.id === emojiId);
      if (emoji) {
        emoji.isFavorite = false;
        return true;
      }
      return false;
    }

    // SQLite を使用
    const result = db.prepare('DELETE FROM favorites WHERE emoji_id = ?').run(emojiId);
    
    return result.changes > 0;
  } catch (error) {
    console.error('お気に入り削除エラー:', error);
    // エラー時はインメモリデータを操作
    const emoji = inMemoryData.emojis.find(e => e.id === emojiId);
    if (emoji) {
      emoji.isFavorite = false;
      return true;
    }
    return false;
  }
}

/**
 * 履歴に絵文字の使用を記録
 */
function addToHistory(emojiId: number): boolean {
  try {
    // SQLite が使用できない場合はインメモリデータを使用
    if (!sqlite || !db) {
      const emoji = inMemoryData.emojis.find(e => e.id === emojiId);
      if (emoji) {
        inMemoryData.history.unshift({ emojiId, usedAt: new Date().toISOString() });
        // 履歴は最大20件まで
        if (inMemoryData.history.length > 20) {
          inMemoryData.history.pop();
        }
        return true;
      }
      return false;
    }

    // SQLite を使用
    const now = new Date().toISOString();
    
    const result = db.prepare('INSERT INTO history (emoji_id, used_at) VALUES (?, ?)').run(emojiId, now);
    
    return result.changes > 0;
  } catch (error) {
    console.error('履歴追加エラー:', error);
    // エラー時はインメモリデータを操作
    const emoji = inMemoryData.emojis.find(e => e.id === emojiId);
    if (emoji) {
      inMemoryData.history.unshift({ emojiId, usedAt: new Date().toISOString() });
      if (inMemoryData.history.length > 20) {
        inMemoryData.history.pop();
      }
      return true;
    }
    return false;
  }
}

/**
 * 最近使用した絵文字を取得
 */
function getRecentEmojis(limit: number = 10): Emoji[] {
  try {
    // SQLite が使用できない場合はインメモリデータを使用
    if (!sqlite || !db) {
      // 履歴からemoji_idを取り出し、重複を除去
      const recentEmojiIds = [...new Set(inMemoryData.history.map(h => h.emojiId))];
      // 最新のlimit件のみ取得
      const limitedIds = recentEmojiIds.slice(0, limit);
      // ID順に絵文字を取得
      return limitedIds
        .map(id => inMemoryData.emojis.find(emoji => emoji.id === id))
        .filter(emoji => emoji !== undefined) as Emoji[];
    }    // SQLite を使用
    const query = `
      SELECT e.id, e.unicode, e.short_name, e.group_name, e.subgroup,
             EXISTS(SELECT 1 FROM favorites WHERE emoji_id = e.id) as isFavorite,
             MAX(h.used_at) as last_used
      FROM emojis e
      JOIN history h ON e.id = h.emoji_id
      GROUP BY e.id
      ORDER BY last_used DESC
      LIMIT ?
    `;
    
    const results = db.prepare(query).all(limit);
    
    return results.map((row: any) => ({
      ...row,
      keywords: [], // キーワードがデータベースに存在しない場合は空配列を使用
      isFavorite: Boolean(row.isFavorite)
    }));
    
  } catch (error) {
    console.error('最近使用した絵文字取得エラー:', error);
    // エラー時はインメモリデータを使用
    const recentEmojiIds = [...new Set(inMemoryData.history.map(h => h.emojiId))];
    const limitedIds = recentEmojiIds.slice(0, limit);
    return limitedIds
      .map(id => inMemoryData.emojis.find(emoji => emoji.id === id))
      .filter(emoji => emoji !== undefined) as Emoji[];
  }
}

/**
 * 履歴から特定の絵文字を削除
 */
function removeFromHistory(emojiId: number): boolean {
  try {
    // SQLite が使用できない場合はインメモリデータを使用
    if (!sqlite || !db) {
      const index = inMemoryData.history.findIndex(h => h.emojiId === emojiId);
      if (index !== -1) {
        inMemoryData.history.splice(index, 1);
        return true;
      }
      return false;
    }

    // SQLite を使用
    const result = db.prepare('DELETE FROM history WHERE emoji_id = ?').run(emojiId);
    
    return result.changes > 0;
  } catch (error) {
    console.error('履歴削除エラー:', error);
    // エラー時はインメモリデータを操作
    const index = inMemoryData.history.findIndex(h => h.emojiId === emojiId);
    if (index !== -1) {
      inMemoryData.history.splice(index, 1);
      return true;
    }
    return false;
  }
}

/**
 * 履歴を全て削除
 */
function clearHistory(): boolean {
  try {
    // SQLite が使用できない場合はインメモリデータを使用
    if (!sqlite || !db) {
      inMemoryData.history = [];
      return true;
    }

    // SQLite を使用
    const result = db.prepare('DELETE FROM history').run();
    
    return true; // 履歴がなくても成功とみなす
  } catch (error) {
    console.error('履歴全削除エラー:', error);
    // エラー時はインメモリデータを操作
    inMemoryData.history = [];
    return true;
  }
}

// 関数をエクスポート
export {
  initializeDB,
  getEmojis,
  searchEmojis,
  getFavorites,
  addToFavorites,
  removeFromFavorites,
  addToHistory,
  getRecentEmojis,
  removeFromHistory,
  clearHistory
};