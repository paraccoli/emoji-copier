import json
import os
import sqlite3
import time
from pathlib import Path

def create_database():
    """データベースとテーブルを作成する"""
    # データベースファイルへのパスを取得
    db_path = Path('data/emojis.db')
    
    # データベースディレクトリが存在しない場合は作成
    db_path.parent.mkdir(exist_ok=True)
    
    # データベースファイルが既に存在する場合は削除
    if db_path.exists():
        os.remove(db_path)
    
    # SQLite3データベースに接続
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # テーブル作成
    cursor.execute('''
    CREATE TABLE emojis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unicode TEXT NOT NULL,
      short_name TEXT NOT NULL,
      group_name TEXT,
      subgroup TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE emoji_keywords (
      emoji_id INTEGER NOT NULL,
      keyword_id INTEGER NOT NULL,
      PRIMARY KEY (emoji_id, keyword_id),
      FOREIGN KEY (emoji_id) REFERENCES emojis (id) ON DELETE CASCADE,
      FOREIGN KEY (keyword_id) REFERENCES keywords (id) ON DELETE CASCADE
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      emoji_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (emoji_id) REFERENCES emojis (id) ON DELETE CASCADE
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      emoji_id INTEGER NOT NULL,
      used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (emoji_id) REFERENCES emojis (id) ON DELETE CASCADE
    )
    ''')
    
    # インデックス作成
    cursor.execute('CREATE INDEX idx_emojis_unicode ON emojis(unicode)')
    cursor.execute('CREATE INDEX idx_emojis_short_name ON emojis(short_name)')
    cursor.execute('CREATE INDEX idx_emojis_group ON emojis(group_name)')
    cursor.execute('CREATE INDEX idx_emojis_subgroup ON emojis(subgroup)')
    cursor.execute('CREATE INDEX idx_keywords_keyword ON keywords(keyword)')
    cursor.execute('CREATE INDEX idx_history_used_at ON history(used_at)')
    
    conn.commit()
    return conn

def import_data(conn):
    """emoji_ja.jsonからデータをインポート"""
    cursor = conn.cursor()
    
    # emoji_ja.jsonファイルを開く
    emoji_data_path = Path('emoji-ja-20250319/data/emoji_ja.json')
    if not emoji_data_path.exists():
        print(f"エラー: {emoji_data_path} が見つかりません")
        return
    
    with open(emoji_data_path, 'r', encoding='utf-8') as f:
        emoji_data = json.load(f)
    
    # キーワード辞書を初期化（重複を避けるため）
    keyword_dict = {}
    
    # 各絵文字をデータベースに挿入
    print("絵文字データをインポート中...")
    count = 0
    batch_size = 100  # バッチサイズ
    
    for unicode, data in emoji_data.items():
        # 無意味な記号や分類がないものは除外することもできる
        # if not data.get('group') and not data.get('subgroup'):
        #     continue
        
        short_name = data.get('short_name', '')
        group_name = data.get('group', '')
        subgroup = data.get('subgroup', '')
        
        # 絵文字レコードを挿入
        cursor.execute(
            'INSERT INTO emojis (unicode, short_name, group_name, subgroup) VALUES (?, ?, ?, ?)',
            (unicode, short_name, group_name, subgroup)
        )
        emoji_id = cursor.lastrowid
        
        # キーワードを処理
        keywords = data.get('keywords', [])
        # short_nameもキーワードとして追加
        if short_name and short_name not in keywords:
            keywords.append(short_name)
            
        for keyword in keywords:
            if keyword not in keyword_dict:
                cursor.execute('INSERT INTO keywords (keyword) VALUES (?)', (keyword,))
                keyword_dict[keyword] = cursor.lastrowid
            
            # 絵文字とキーワードを関連付け
            cursor.execute(
                'INSERT INTO emoji_keywords (emoji_id, keyword_id) VALUES (?, ?)',
                (emoji_id, keyword_dict[keyword])
            )
        
        count += 1
        if count % batch_size == 0:
            conn.commit()
            print(f"{count}件の絵文字を処理しました...")
    
    conn.commit()
    print(f"合計 {count} 件の絵文字をインポートしました")
    print(f"合計 {len(keyword_dict)} 件のキーワードをインポートしました")

def main():
    start_time = time.time()
    print("絵文字データベースの作成を開始します...")
    
    # データベース作成
    conn = create_database()
    
    # データのインポート
    import_data(conn)
    
    # データベース接続を閉じる
    conn.close()
    
    elapsed_time = time.time() - start_time
    print(f"完了しました！処理時間: {elapsed_time:.2f}秒")
    print("データベースは data/emojis.db に保存されました")

if __name__ == "__main__":
    main()