# 🚀 次のアクションプラン

## ✅ 完了した機能（現在の状態）

### 基本機能
- ✅ ホスト/ゲストの役割分担
- ✅ お題作成（テンプレート：背景/現状/課題）
- ✅ 日程選択（2026年4月〜6月の木曜12-13時）
- ✅ パスワード認証（Supabase管理）

### データベース
- ✅ Supabase統合完了
- ✅ セッション、参加者、アイデア、メッセージ等のテーブル
- ✅ リアルタイム同期（複数ユーザー対応）

### 認証
- ✅ Google OAuth認証
- ✅ ユーザー情報自動取得
- ✅ ログイン/ログアウト機能

---

## 📋 次回実装する機能

### Phase 1: Google Meet & Calendar連携 🎥📅

#### オプションA: 簡易版（推奨・すぐ実装可能）
```
1. ホスト画面に「Google Meet URL」入力欄を追加
2. Supabaseに保存
3. 参加者全員に共有
4. ブレインストーミング画面の「Meet参加」ボタンで開く
```

**実装時間**: 30分〜1時間

#### オプションB: 完全自動版（本格的）
```
1. Google Calendar APIを有効化
2. 追加スコープ設定
   - calendar.events（カレンダー編集）
3. Vercel Serverless Function作成
   - カレンダーイベント自動作成
   - Meet URL自動生成
4. フロントエンドと連携
```

**実装時間**: 3〜5時間

**必要な設定**:
- Google Cloud Console: Calendar API有効化
- OAuth スコープ追加: `https://www.googleapis.com/auth/calendar.events`

---

### Phase 2: AI連携の強化 🤖

#### 現在のAI機能
- Claude Sonnet 4: アイデアの深掘り質問、AI分析

#### 追加するAI機能

**1. Gemini API連携**
```javascript
使い分け:
- Claude: メイン分析、深い思考
- Gemini: 要約、翻訳、補助的なタスク
```

**実装内容**:
```
1. Gemini APIキーを.envに追加
2. AI分析時にClaude + Geminiを併用
   - Claude: クラスタリング、論点抽出
   - Gemini: 要約、アイデアの分類補助
3. コスト最適化
   - 簡単なタスクはGemini
   - 複雑な分析はClaude
```

**2. AI分析結果の永続化**
```
- mapping_resultsテーブルに保存（実装済み）
- 再マッピング履歴の保存
- AI分析の比較機能
```

**3. リアルタイムAIフィードバック**
```
- 議論中のリアルタイム要約
- キーワード抽出
- 感情分析（ポジティブ/ネガティブ）
```

---

### Phase 3: Google Drive連携 📎

```
1. Google Drive APIを有効化
2. OAuth スコープ追加: 
   - drive.file（ファイルアップロード）
3. PDF資料の自動アップロード
4. 共有リンク生成
5. 参加者全員がアクセス可能
```

---

### Phase 4: UX改善 ✨

**1. 参加者のオンライン状態表示**
```
- リアルタイムで「誰がオンラインか」表示
- アバター表示
- 参加者リストの更新
```

**2. 通知機能**
```
- 新しいアイデアが投稿されたら通知
- AI分析完了の通知
- セッション開始前のリマインダー
```

**3. モバイル対応強化**
```
- レスポンシブデザインの最適化
- タッチ操作の改善
```

---

## 🔧 環境変数の追加（今後必要）

```bash
# .env ファイルに追加予定

# Gemini API
VITE_GEMINI_API_KEY=your-gemini-api-key

# Google APIs（完全自動版の場合）
VITE_GOOGLE_CALENDAR_ENABLED=true
```

---

## 📚 参考リンク

### API Documentation
- [Google Calendar API](https://developers.google.com/calendar/api/guides/overview)
- [Google Meet API](https://developers.google.com/meet)
- [Gemini API](https://ai.google.dev/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)

### 現在の設定
- **Supabase Project**: ysdlfttflheidkclmtbo
- **Google OAuth Client ID**: 574364248563-egu0o2m7p9mj34e17bmtk7o8si1ev4it.apps.googleusercontent.com
- **GitHub Repository**: https://github.com/samboofficeota-hue/brainstormer

---

## 🎯 推奨実装順序

### 次回セッション（1〜2時間）
1. **Google Meet URL手動入力機能**（簡易版）
2. **Gemini API基本連携**

### その後（3〜5時間）
3. **Google Calendar API自動連携**（完全自動版）
4. **Google Drive PDF連携**

### 最後（2〜3時間）
5. **参加者オンライン状態**
6. **通知機能**
7. **モバイル最適化**

---

## 💾 現在のコード状態

- **フロントエンド**: React + Vite + Tailwind CSS
- **バックエンド**: Supabase（PostgreSQL + Realtime）
- **認証**: Supabase Auth（Google OAuth）
- **AI**: Claude Sonnet 4
- **ホスティング**: Vercel（予定）

---

## 📝 メモ

- 開発サーバー: `npm run dev`
- ローカルURL: http://localhost:5173/brainstormer/
- デモ用パスワード: `host123`

次回開始時にこのファイルを確認してください！🚀
