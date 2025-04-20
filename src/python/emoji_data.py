"""
絵文字データの処理とデータベース操作のユーティリティ。
emoji-ja-20250319データセットを使用して絵文字データを初期化・処理する。
"""

import json
import os
import sqlite3
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('emoji-data')

class EmojiData:
    """
    絵文字データの操作とデータベース接続を管理するクラス
    """
    
    def __init__(self, db_path: str = None):
        """
        EmojiDataクラスのインスタンスを初期化
        
        Args:
            db_path: SQLiteデータベースファイルへのパス。指定がなければデフォルトパスを使用
        """
        # デフォルトのデータベースパス
        if db_path is None:
            # アプリのデータディレクトリを取得
            app_data_dir = os.environ.get('APPDATA') if os.name == 'nt' else os.path.expanduser('~/.local/share')
            db_path = os.path.join(app_data_dir, 'emoji-copier', 'data', 'emojis.db')
        
        self.db_path = db_path
        self.conn = None
        self.ensure_db_exists()
    
    def ensure_db_exists(self) -> None:
        """
        指定されたパスにデータベースが存在することを確認します。
        存在しない場合は、デフォルトの場所からコピーするか、エラーをログに記録します。
        """
        if not os.path.exists(self.db_path):
            logger.warning(f"データベースが見つかりません: {self.db_path}")
            
            # アプリケーションのディレクトリから探す
            app_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
            default_db = os.path.join(app_dir, 'data', 'emojis.db')
            
            if os.path.exists(default_db):
                logger.info(f"デフォルトのデータベースを使用: {default_db}")
                
                # データベースのディレクトリが存在することを確認
                os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
                
                # データベースをコピー
                import shutil
                shutil.copy2(default_db, self.db_path)
                logger.info(f"データベースをコピーしました: {default_db} → {self.db_path}")
            else:
                logger.error(f"デフォルトのデータベースも見つかりません: {default_db}")
                raise FileNotFoundError(f"データベースが見つかりません: {self.db_path}")
    
    def connect(self) -> sqlite3.Connection:
        """
        SQLiteデータベースに接続し、接続オブジェクトを返す
        """
        if self.conn is None:
            try:
                self.conn = sqlite3.connect(self.db_path)
                self.conn.row_factory = sqlite3.Row  # 辞書形式で結果を取得
            except sqlite3.Error as e:
                logger.error(f"データベース接続エラー: {e}")
                raise
        return self.conn
    
    def close(self) -> None:
        """
        データベース接続を閉じる
        """
        if self.conn:
            self.conn.close()
            self.conn = None
    
    def get_emoji_by_id(self, emoji_id: int) -> Optional[Dict[str, Any]]:
        """
        IDから絵文字データを取得
        
        Args:
            emoji_id: 絵文字のID
            
        Returns:
            絵文字データの辞書、見つからない場合はNone
        """
        conn = self.connect()
        cursor = conn.cursor()
        
        try:
            query = """
            SELECT 
                e.id, e.unicode, e.short_name, e.group_name, e.subgroup,
                GROUP_CONCAT(k.keyword, ',') as keywords,
                CASE WHEN f.emoji_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite
            FROM 
                emojis e
            LEFT JOIN 
                emoji_keywords ek ON e.id = ek.emoji_id
            LEFT JOIN 
                keywords k ON ek.keyword_id = k.id
            LEFT JOIN 
                favorites f ON e.id = f.emoji_id
            WHERE 
                e.id = ?
            GROUP BY 
                e.id
            """
            cursor.execute(query, (emoji_id,))
            row = cursor.fetchone()
            
            if row:
                # SQLite Rowオブジェクトを辞書に変換
                emoji = dict(row)
                emoji['keywords'] = emoji['keywords'].split(',') if emoji['keywords'] else []
                emoji['is_favorite'] = bool(emoji['is_favorite'])
                return emoji
            return None
        except sqlite3.Error as e:
            logger.error(f"絵文字取得中にエラーが発生しました: {e}")
            return None
    
    def search_emojis(self, query: str = None, group: str = None, 
                     limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """
        条件に一致する絵文字を検索
        
        Args:
            query: 検索キーワード
            group: 絵文字グループ名
            limit: 返す結果の最大数
            offset: 結果セットのオフセット
            
        Returns:
            絵文字データのリスト
        """
        conn = self.connect()
        cursor = conn.cursor()
        
        try:
            sql_parts = ["""
            SELECT 
                e.id, e.unicode, e.short_name, e.group_name, e.subgroup,
                GROUP_CONCAT(k.keyword, ',') as keywords,
                CASE WHEN f.emoji_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite
            FROM 
                emojis e
            LEFT JOIN 
                emoji_keywords ek ON e.id = ek.emoji_id
            LEFT JOIN 
                keywords k ON ek.keyword_id = k.id
            LEFT JOIN 
                favorites f ON e.id = f.emoji_id
            """]
            
            conditions = []
            params = []
            
            if query:
                conditions.append("""
                (e.short_name LIKE ? OR EXISTS (
                    SELECT 1 FROM emoji_keywords ek2
                    JOIN keywords k2 ON ek2.keyword_id = k2.id
                    WHERE ek2.emoji_id = e.id AND k2.keyword LIKE ?
                ))
                """)
                params.extend([f'%{query}%', f'%{query}%'])
            
            if group:
                conditions.append("e.group_name = ?")
                params.append(group)
            
            if conditions:
                sql_parts.append("WHERE " + " AND ".join(conditions))
            
            sql_parts.append("GROUP BY e.id")
            sql_parts.append("ORDER BY e.short_name")
            sql_parts.append("LIMIT ? OFFSET ?")
            params.extend([limit, offset])
            
            final_sql = " ".join(sql_parts)
            cursor.execute(final_sql, params)
            
            results = []
            for row in cursor.fetchall():
                emoji = dict(row)
                emoji['keywords'] = emoji['keywords'].split(',') if emoji['keywords'] else []
                emoji['is_favorite'] = bool(emoji['is_favorite'])
                results.append(emoji)
            
            return results
        except sqlite3.Error as e:
            logger.error(f"絵文字検索中にエラーが発生しました: {e}")
            return []
    
    def get_emoji_categories(self) -> List[str]:
        """
        利用可能な絵文字カテゴリ（グループ名）のリストを取得
        
        Returns:
            カテゴリ名のリスト
        """
        conn = self.connect()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
            SELECT DISTINCT group_name 
            FROM emojis 
            WHERE group_name IS NOT NULL AND group_name != ''
            ORDER BY group_name
            """)
            
            return [row[0] for row in cursor.fetchall()]
        except sqlite3.Error as e:
            logger.error(f"カテゴリ取得中にエラーが発生しました: {e}")
            return []
    
    def get_favorites(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        """
        お気に入りの絵文字を取得
        
        Args:
            limit: 返す結果の最大数
            offset: 結果セットのオフセット
            
        Returns:
            絵文字データのリスト
        """
        conn = self.connect()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
            SELECT 
                e.id, e.unicode, e.short_name, e.group_name, e.subgroup,
                GROUP_CONCAT(k.keyword, ',') as keywords,
                1 as is_favorite
            FROM 
                favorites f
            JOIN 
                emojis e ON f.emoji_id = e.id
            LEFT JOIN 
                emoji_keywords ek ON e.id = ek.emoji_id
            LEFT JOIN 
                keywords k ON ek.keyword_id = k.id
            GROUP BY 
                e.id
            ORDER BY 
                f.created_at DESC
            LIMIT ? OFFSET ?
            """, (limit, offset))
            
            results = []
            for row in cursor.fetchall():
                emoji = dict(row)
                emoji['keywords'] = emoji['keywords'].split(',') if emoji['keywords'] else []
                emoji['is_favorite'] = True
                results.append(emoji)
            
            return results
        except sqlite3.Error as e:
            logger.error(f"お気に入り取得中にエラーが発生しました: {e}")
            return []
    
    def add_to_favorites(self, emoji_id: int) -> bool:
        """
        絵文字をお気に入りに追加
        
        Args:
            emoji_id: お気に入りに追加する絵文字のID
            
        Returns:
            追加に成功した場合はTrue、それ以外はFalse
        """
        conn = self.connect()
        cursor = conn.cursor()
        
        try:
            # 既にお気に入りに追加されているか確認
            cursor.execute("SELECT 1 FROM favorites WHERE emoji_id = ?", (emoji_id,))
            if cursor.fetchone():
                logger.info(f"絵文字ID {emoji_id} は既にお気に入りに追加されています")
                return True
            
            # お気に入りに追加
            cursor.execute("INSERT INTO favorites (emoji_id) VALUES (?)", (emoji_id,))
            conn.commit()
            logger.info(f"絵文字ID {emoji_id} をお気に入りに追加しました")
            return True
        except sqlite3.Error as e:
            logger.error(f"お気に入り追加中にエラーが発生しました: {e}")
            conn.rollback()
            return False
    
    def remove_from_favorites(self, emoji_id: int) -> bool:
        """
        絵文字をお気に入りから削除
        
        Args:
            emoji_id: お気に入りから削除する絵文字のID
            
        Returns:
            削除に成功した場合はTrue、それ以外はFalse
        """
        conn = self.connect()
        cursor = conn.cursor()
        
        try:
            cursor.execute("DELETE FROM favorites WHERE emoji_id = ?", (emoji_id,))
            conn.commit()
            logger.info(f"絵文字ID {emoji_id} をお気に入りから削除しました")
            return True
        except sqlite3.Error as e:
            logger.error(f"お気に入り削除中にエラーが発生しました: {e}")
            conn.rollback()
            return False
    
    def add_to_history(self, emoji_id: int) -> bool:
        """
        絵文字を使用履歴に追加
        
        Args:
            emoji_id: 履歴に追加する絵文字のID
            
        Returns:
            追加に成功した場合はTrue、それ以外はFalse
        """
        conn = self.connect()
        cursor = conn.cursor()
        
        try:
            cursor.execute("INSERT INTO history (emoji_id) VALUES (?)", (emoji_id,))
            conn.commit()
            logger.info(f"絵文字ID {emoji_id} を履歴に追加しました")
            return True
        except sqlite3.Error as e:
            logger.error(f"履歴追加中にエラーが発生しました: {e}")
            conn.rollback()
            return False
    
    def get_recent_emojis(self, limit: int = 20) -> List[Dict[str, Any]]:
        """
        最近使用した絵文字を取得
        
        Args:
            limit: 返す結果の最大数
            
        Returns:
            絵文字データのリスト
        """
        conn = self.connect()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
            SELECT 
                e.id, e.unicode, e.short_name, e.group_name, e.subgroup,
                GROUP_CONCAT(k.keyword, ',') as keywords,
                CASE WHEN f.emoji_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite,
                MAX(h.used_at) as last_used
            FROM 
                history h
            JOIN 
                emojis e ON h.emoji_id = e.id
            LEFT JOIN 
                emoji_keywords ek ON e.id = ek.emoji_id
            LEFT JOIN 
                keywords k ON ek.keyword_id = k.id
            LEFT JOIN 
                favorites f ON e.id = f.emoji_id
            GROUP BY 
                e.id
            ORDER BY 
                last_used DESC
            LIMIT ?
            """, (limit,))
            
            results = []
            for row in cursor.fetchall():
                emoji = dict(row)
                emoji['keywords'] = emoji['keywords'].split(',') if emoji['keywords'] else []
                emoji['is_favorite'] = bool(emoji['is_favorite'])
                emoji.pop('last_used', None)  # last_usedフィールドを削除
                results.append(emoji)
            
            return results
        except sqlite3.Error as e:
            logger.error(f"最近使用した絵文字の取得中にエラーが発生しました: {e}")
            return []

def main():
    """
    テスト用のメイン関数
    """
    import sys
    
    # コマンドライン引数のパース
    if len(sys.argv) < 2:
        print("使用方法: python emoji_data.py [search <クエリ>|categories|favorites|info <絵文字ID>]")
        sys.exit(1)
    
    emoji_data = EmojiData()
    command = sys.argv[1]
    
    try:
        if command == 'search' and len(sys.argv) >= 3:
            query = sys.argv[2]
            results = emoji_data.search_emojis(query=query)
            print(f"検索結果 ('{query}'):")
            for emoji in results:
                print(f"{emoji['unicode']} - {emoji['short_name']} ({emoji['group_name']})")
            print(f"合計: {len(results)}件")
        
        elif command == 'categories':
            categories = emoji_data.get_emoji_categories()
            print("絵文字カテゴリ:")
            for category in categories:
                print(f"- {category}")
        
        elif command == 'favorites':
            favorites = emoji_data.get_favorites()
            print("お気に入りの絵文字:")
            for emoji in favorites:
                print(f"{emoji['unicode']} - {emoji['short_name']}")
            print(f"合計: {len(favorites)}件")
        
        elif command == 'info' and len(sys.argv) >= 3:
            emoji_id = int(sys.argv[2])
            emoji = emoji_data.get_emoji_by_id(emoji_id)
            if emoji:
                print(f"絵文字情報 (ID: {emoji_id}):")
                print(f"Unicode: {emoji['unicode']}")
                print(f"名前: {emoji['short_name']}")
                print(f"グループ: {emoji['group_name']}")
                print(f"サブグループ: {emoji['subgroup']}")
                print(f"キーワード: {', '.join(emoji['keywords'])}")
                print(f"お気に入り: {'はい' if emoji['is_favorite'] else 'いいえ'}")
            else:
                print(f"ID {emoji_id} の絵文字は見つかりませんでした。")
        
        else:
            print("無効なコマンドです。")
            print("使用方法: python emoji_data.py [search <クエリ>|categories|favorites|info <絵文字ID>]")
    
    finally:
        emoji_data.close()

if __name__ == "__main__":
    main()