# emoji-copier - 絵文字を素早く検索・コピーできるデスクトップアプリ

`emoji-copier`は、絵文字を効率よく検索し、ワンクリックでクリップボードにコピーできる軽量なElectronデスクトップアプリケーションです。日本語での検索、お気に入り機能、履歴管理などを備えています。

[![バージョン](https://img.shields.io/badge/バージョン-1.0.0-orange)](https://github.com/paraccoli/emoji-copier/releases)
[![ライセンス: MIT](https://img.shields.io/badge/ライセンス-MIT-green)](LICENSE)


## ✨ 主な機能

- **🔍 高速検索**: 絵文字の名前や説明を素早く検索
- **🇯🇵 日本語対応**: 日本語での検索や表示に最適化
- **📋 ワンクリックコピー**: クリックするだけで絵文字をクリップボードにコピー
- **⭐ お気に入り**: よく使う絵文字をお気に入りに登録
- **🕒 履歴管理**: 最近使用した絵文字を簡単に再利用
- **🌙 カラーテーマ**: システムの設定に合わせたライト/ダークモード対応

## 📥 インストール

### Windows

1. [Releases](https://github.com/paraccoli/emoji-copier/releases) のZipファイル(`Emoji-Copier_v1.0.0`)をダウンロード
2. ダウンロードしたファイルを実行し、画面の指示に従ってインストール

## 🚀 使い方

1. アプリケーションを起動
2. 検索ボックスに絵文字の名前や説明を入力
3. 表示された絵文字をクリックしてコピー
4. お気に入りに追加するには星マークをクリック
5. 履歴タブで最近使用した絵文字を確認

## 🛠️ 開発環境のセットアップ

emoji-copier をローカルで開発する手順は以下の通りです。

### 前提条件

- [Node.js](https://nodejs.org/) (v16以上)
- [Python](https://www.python.org/) (v3.8以上)
- [Git](https://git-scm.com/)

### セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/paraccoli/emoji-copier.git
cd emoji-copier

# Node.js 依存関係のインストール
npm install

# Python 依存関係のインストール
pip install -r requirements.txt

# データベースの作成とシード
npm run seed
```

### 開発サーバーの実行

```bash
# 開発モードで実行
npm run dev
```

### ビルド

```bash
# 配布用パッケージのビルド
npm run make
```

ビルドされたパッケージは `out` ディレクトリに生成されます。

## 📦 プロジェクト構造

```
emoji-copier/
├── data/               # データベースファイル
├── emoji-ja-20250319/  # 日本語絵文字データセット
├── scripts/            # データベース初期化などのスクリプト
├── src/
│   ├── main/          # Electron メインプロセスコード
│   ├── python/        # Python スクリプト (クリップボード操作など)
│   └── renderer/      # フロントエンド UI コード (React)
├── package.json        # プロジェクト設定
└── README.md           # このファイル
```

## 🔧 テクノロジースタック

- **フロントエンド**: React, TypeScript, Tailwind CSS
- **バックエンド**: Electron, Node.js, SQLite
- **クリップボード操作**: Python
- **ビルドツール**: Vite, Electron Forge

## 🤝 貢献

バグレポートや機能リクエスト、プルリクエストなど、あらゆる貢献を歓迎します！

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチをプッシュ (`git push origin amazing-feature`)
5. プルリクエストをオープン

## 📜 ライセンス

MIT ライセンスで配布されています。詳細は LICENSE ファイルをご覧ください。

## 🙏 謝辞

- 絵文字データベースは [emoji-ja](https://github.com/yagays/emoji-ja) を使用しています
- このプロジェクトは MIT ライセンス で公開されています

## 📧 連絡先

質問やフィードバックがある場合は、[Issues](https://github.com/paraccoli/emoji-copier/issues) を開くか、以下の連絡先までご連絡ください。

- メール: contact@paraccoli.com
- Twitter: [@Paraccoli](https://x.com/paraccoli)

---

Made with ❤️ by [Paraccoli](https://github.com/paraccoli)
