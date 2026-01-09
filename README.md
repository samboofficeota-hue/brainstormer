# 集団ブレインストーミングアプリ 🧠💡

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Made with React](https://img.shields.io/badge/Made%20with-React-61dafb.svg)](https://reactjs.org/)
[![AI Powered](https://img.shields.io/badge/AI-Claude-purple.svg)](https://www.anthropic.com/)

AIファシリテーターが支援する、大人数向けブレインストーミングアプリケーションです。

![ブレインストーミングアプリ](https://via.placeholder.com/800x400/f59e0b/ffffff?text=Brainstorming+App)

## 📋 目次

- [特徴](#-特徴)
- [デモ](#-デモ)
- [インストール](#-インストール)
- [使用方法](#-使用方法)
- [主な機能](#主な機能)
- [技術仕様](#技術仕様)
- [参考プロジェクト](#参考にしたプロジェクト)
- [ライセンス](#ライセンス)

## ✨ 特徴

- 🤖 **AI ファシリテーター**: Claude + Gemini APIが思考を深掘りする質問を自動生成
- 🗺️ **自動マッピング**: Gemini AIがアイデアを自動的にクラスタリングして論点を抽出
- 🎤 **音声認識**: ディスカッションを自動で文字起こし
- 👥 **ホスト/ゲスト機能**: セッションを主催したり、参加したりできる
- 🎥 **Google Meet統合**: オンライン会議URLを統合
- 🔐 **Google OAuth**: Googleアカウントでログイン可能
- 💾 **Supabase連携**: リアルタイムデータ同期とセッション管理
- 🎨 **美しいUI**: モダンで親しみやすいデザイン

## 🚀 デモ

GitHub Pagesでデモを確認できます：
👉 [デモを見る](https://samboofficeota-hue.github.io/brainstormer/brainstorm-app.html)

> **注意**: GitHub Pagesを有効にするには、リポジトリの Settings → Pages で設定してください。

## 💾 インストール

### 必要な環境

- Node.js (v18以上推奨)
- npm または yarn

### インストール手順

```bash
# リポジトリをクローン
git clone https://github.com/samboofficeota-hue/brainstormer.git
cd brainstormer

# 依存関係をインストール
npm install

# .env ファイルを作成（重要！）
cp .env.example .env
# .env ファイルを開いて、あなたのAnthropic APIキーを設定してください

# 開発サーバーを起動
npm run dev
```

### APIキーの取得

**Anthropic API (Claude):**
1. [Anthropic Console](https://console.anthropic.com/) にアクセス
2. APIキーを作成
3. `.env` ファイルに `VITE_ANTHROPIC_API_KEY=your-api-key` として設定

**Gemini API:**
1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. APIキーを作成
3. `.env` ファイルに `VITE_GEMINI_API_KEY=your-gemini-api-key` として設定

**Supabase:**
1. [Supabase](https://supabase.com) でプロジェクトを作成
2. Project Settings → API から以下を取得：
   - Project URL
   - Publishable key (anon key)
3. `.env` ファイルに設定：
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-key
```
4. SQL Editor で `supabase-schema.sql` を実行してテーブルを作成
5. Authentication → Providers → Google を有効化し、OAuth認証情報を設定

**Google OAuth + Drive API:**
1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成
2. APIs & Services → Library から以下のAPIを有効化：
   - Google Drive API
   - Google Picker API
3. APIs & Services → OAuth consent screen を設定
4. Credentials → Create Credentials → OAuth 2.0 Client ID
5. Authorized redirect URIs に Supabase の Callback URL を追加
6. Client ID と Client Secret を Supabase の Google Provider 設定に追加
7. Credentials → Create Credentials → API Key を作成
8. `.env` ファイルに `VITE_GOOGLE_API_KEY=your-api-key` として設定

## 主な機能

### 1. ホスト/ゲスト選択
- **ホスト**: セッションを作成し、テーマを設定
- **ゲスト**: 既存のセッションに参加
- **Google OAuth**: Googleアカウントでログイン可能

### 2. ホスト - セッション作成
- テーマ（タイトル）の設定
- 補足情報（背景、現状、課題）の入力
- **PDF資料の選択（Google Drive Picker）** - Googleログイン後、Drive上のPDFを選択可能
- 開催日時の選択（木曜12:00-13:00、2026年4-6月）
- **Google Meet URL** の入力
- パスワード設定（後でホストとして再ログイン可能）

### 3. ブレインストーミング（10分間）
- 参加者がアイデアを自由に投稿
- AIが各アイデアに対して質問を投げかけ、思考を深掘り
- チャット形式でのインタラクティブな対話
- **Google Meet** ボタンでオンライン会議に参加
- リアルタイム同期（Supabase）

### 4. AI分析・マッピング（Gemini）
- 集まったアイデアを**Gemini AI**が自動的にクラスタリング
- テーマごとにアイデアを整理
- 主要な論点を抽出

### 5. リアルディスカッション
- マッピング結果をもとにした対面での議論
- 音声認識による自動議事録作成
- ブラウザのWeb Speech APIを使用
- **Google Meet** で遠隔参加可能

### 5. 再マッピング
- ディスカッションの内容を踏まえた再分析
- 新しい洞察の抽出
- 更新された論点の提示

## 📖 使用方法

### ステップ1: セットアップ 🎯
`brainstorm-app.html` をブラウザで開いてください。

**初期設定:**
- **あなたの名前**: 参加者名を入力
- **ブレインストーミングのテーマ**: 議論したいテーマを入力

例: 「地域コミュニティを活性化する新しい施策について」

### ステップ2: ブレインストーミング 💭
- 「ブレインストーミングを開始」ボタンをクリック
- 10分間のタイマーが開始されます
- アイデアを入力欄に記入して送信
- AIが質問を投げかけてくるので、それに応答

### ステップ3: AI分析 🔍
- 10分経過後、自動的にAI分析が開始
- アイデアがクラスタリングされ、論点が抽出されます

### ステップ4: マッピング結果 🗺️
- アイデアがテーマごとに分類された結果を確認
- 主要な論点をチェック
- 「ディスカッションを開始」をクリック

### ステップ5: リアルディスカッション 🎙️
- 音声認識を開始（再生ボタンをクリック）
- 対面で議論を行う
- 議論内容は自動的に文字起こしされます

**⚠️ 注意**: 音声認識はChrome、Edge、Safariで動作します。

### ステップ6: 再マッピング 🔄
- 「ディスカッションを踏まえて再マッピング」をクリック
- ディスカッションの内容を反映した新しい分析結果を確認

### ステップ7: セッション完了 ✅
- 結果を確認
- 必要に応じて「新しいセッションを開始」で次のセッションへ

## 🛠️ 技術仕様

### 使用技術
- **ビルドツール**: Vite 6 ⚡
- **フロントエンド**: React 18 ⚛️
- **スタイリング**: Tailwind CSS 🎨
- **AI**: Anthropic Claude API (Claude Sonnet 4) 🤖
- **音声認識**: Web Speech API 🎤

### ブラウザ要件
- **推奨ブラウザ**: Chrome, Edge, Safari 🌐
- **音声認識**: Chrome, Edge, Safari（最新版）
- **JavaScript**: 有効にする必要があります

### プロジェクト構造
```
brainstorm-app/
├── src/
│   ├── App.jsx              # メインアプリケーション
│   ├── main.jsx            # エントリーポイント
│   ├── index.css           # スタイル
│   └── components/
│       └── Icons.jsx       # アイコンコンポーネント
├── index.html              # HTMLテンプレート
├── package.json            # 依存関係
├── vite.config.js          # Vite設定
├── tailwind.config.js      # Tailwind CSS設定
├── .env                    # 環境変数（APIキー）※Git非管理
└── .env.example            # 環境変数のテンプレート
```

### npm スクリプト
```bash
npm run dev      # 開発サーバーを起動
npm run build    # 本番用にビルド
npm run preview  # ビルドしたアプリをプレビュー
```

### API設定
このアプリケーションはAnthropic APIを使用します。`.env` ファイルにAPIキーを設定してください。

## 参考にしたプロジェクト

このアプリケーションは以下のオープンソースプロジェクトを参考に作成されました：

1. **idobata** (https://github.com/samboofficeota-hue/idobata)
   - 民主主義における議論・合意形成支援システム
   - いどばたビジョン: テーマに対する意見収集と論点整理
   - いどばた政策: 具体的な施策案の改善

2. **kouchou-ai（広聴AI）** (https://github.com/digitaldemocracy2030/kouchou-ai)
   - ブロードリスニングを実現するソフトウェア
   - 意見のクラスタリング、分析、レポート生成
   - チャット形式での意見収集

## 特徴

### デザイン
- 温かみのあるグラデーションカラー（オレンジ、ローズ、アンバー）
- 各ステージで異なる配色を使用
- スムーズなアニメーション
- モダンで親しみやすいUI

### ユーザー体験
- ステップバイステップのガイド
- リアルタイムのタイマー表示
- 自動スクロールするチャット
- 視覚的に分かりやすいマッピング

## 🤝 コントリビューション

貢献を歓迎します！以下の方法で参加できます：

1. このリポジトリをFork
2. 新しいブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. Pull Requestを作成

### 開発ロードマップ 🗓️

- [ ] マルチユーザー対応（WebSocket実装）
- [ ] データ永続化（ローカルストレージ）
- [ ] PDF/JSONエクスポート機能
- [ ] テンプレート機能
- [ ] 多言語対応
- [ ] カスタマイズ可能なタイマー

## ❓ トラブルシューティング

### 音声認識が動作しない
- Chrome、Edge、Safariの最新版を使用してください
- マイクへのアクセス許可を確認してください
- HTTPSまたはlocalhostで実行してください

### AIが応答しない
- インターネット接続を確認してください
- しばらく待ってから再試行してください

### タイマーが正常に動作しない
- ブラウザのタブがアクティブであることを確認してください

## 📞 サポート

問題や質問がある場合：
- 📝 [Issues](https://github.com/samboofficeota-hue/brainstormer/issues) で報告
- 💬 参考プロジェクトのコミュニティに参加
  - [idobata Issues](https://github.com/digitaldemocracy2030/idobata/issues)
  - [kouchou-ai Issues](https://github.com/digitaldemocracy2030/kouchou-ai/issues)

## 📄 ライセンス

このプロジェクトは [GNU General Public License v3.0](LICENSE) の下でライセンスされています。

参考プロジェクトのライセンス：
- idobata: GNU General Public License v3.0 (GPL-3.0)
- kouchou-ai: AGPL-3.0 license

## 💻 開発者向け情報

### カスタマイズ
- **タイマーの時間**: `setTimeRemaining(600)` を変更（秒単位）
- **AIモデル**: `model` パラメータを変更
- **スタイル**: Tailwindクラスを編集

### 拡張機能の追加
- マルチユーザー対応: WebSocketの実装
- データ永続化: ローカルストレージまたはバックエンド連携
- エクスポート機能: 結果をPDF/JSON形式で保存

## 🌟 謝辞

- [Anthropic](https://www.anthropic.com/) - Claude API提供
- [デジタル民主主義2030](https://dd2030.org/) - 参考プロジェクト開発
- すべてのコントリビューターの皆様

---

Made with ❤️ and 🤖 AI

⭐ このプロジェクトが役に立ったら、スターをつけてください！

