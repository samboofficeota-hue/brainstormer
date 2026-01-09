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

- 🤖 **AI ファシリテーター**: Claude APIが思考を深掘りする質問を自動生成
- 🗺️ **自動マッピング**: アイデアを自動的にクラスタリングして論点を抽出
- 🎤 **音声認識**: ディスカッションを自動で文字起こし
- 🎨 **美しいUI**: モダンで親しみやすいデザイン
- ⚡ **シンプル**: HTMLファイル1つで動作

## 🚀 デモ

GitHub Pagesでデモを確認できます：
👉 [デモを見る](https://samboofficeota-hue.github.io/brainstormer/brainstorm-app.html)

> **注意**: GitHub Pagesを有効にするには、リポジトリの Settings → Pages で設定してください。

## 💾 インストール

### 方法1: 直接ダウンロード

1. このリポジトリをダウンロード（緑の「Code」ボタン → 「Download ZIP」）
2. ZIPファイルを解凍
3. `brainstorm-app.html` をブラウザで開く

### 方法2: Git Clone

```bash
git clone https://github.com/samboofficeota-hue/brainstormer.git
cd brainstormer
open brainstorm-app.html  # macOS
# または
start brainstorm-app.html  # Windows
```

## 主な機能

### 1. セットアップ（準備）
- 参加者名の登録
- ブレインストーミングのテーマ設定

### 2. ブレインストーミング（10分間）
- 参加者がアイデアを自由に投稿
- AIが各アイデアに対して質問を投げかけ、思考を深掘り
- チャット形式でのインタラクティブな対話

### 3. AI分析・マッピング
- 集まったアイデアを自動的にクラスタリング
- テーマごとにアイデアを整理
- 主要な論点を抽出

### 4. リアルディスカッション
- マッピング結果をもとにした対面での議論
- 音声認識による自動議事録作成
- ブラウザのWeb Speech APIを使用

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
- **フロントエンド**: React 18 ⚛️
- **スタイリング**: Tailwind CSS 🎨
- **AI**: Anthropic Claude API (Claude Sonnet 4) 🤖
- **音声認識**: Web Speech API 🎤

### ブラウザ要件
- **推奨ブラウザ**: Chrome, Edge, Safari 🌐
- **音声認識**: Chrome, Edge, Safari（最新版）
- **JavaScript**: 有効にする必要があります

### API設定
このアプリケーションはAnthropic APIを使用します。APIキーの設定は不要ですが、ネットワーク接続が必要です。

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

