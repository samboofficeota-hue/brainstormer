# 実装メモ

## ✅ 完了した機能

### 1. Google Meet統合
- ホストがセッション作成時にMeet URLを手動入力
- ブレインストーミング画面とディスカッション画面にMeetボタンを追加
- Meet URLが設定されている場合、ボタンをクリックで新しいタブでMeetを開く

### 2. Gemini API連携
- アイデア分析機能をClaudeからGeminiに変更
- `handleStageComplete()`: アイデアをクラスタリングして論点を抽出
- `remapIdeas()`: ディスカッション後の再分析
- Gemini 2.0 Flash Exp モデルを使用

### 3. Google OAuth
- Supabaseを通じてGoogleログイン機能を実装
- ログイン状態の表示（アバター、名前）
- ログアウト機能
- ホスト/ゲスト名の自動入力

### 4. Supabaseリアルタイム同期
- セッション一覧のリアルタイム更新
- アイデアのリアルタイム同期
- 参加者情報の管理

## 🔄 今後の実装が必要な機能

### Google Calendar API統合（サーバーサイド実装が必要）

**理由**: Google Calendar APIはOAuth 2.0のアクセストークンが必要で、クライアントサイドだけでは安全に実装できません。

**推奨アーキテクチャ**:

```
[フロントエンド (React)]
    ↓ セッション作成リクエスト
[バックエンド (Vercel Functions / Supabase Edge Functions)]
    ↓ Google Calendar API呼び出し
[Google Calendar API]
    ↓ イベント作成 + Meet URL生成
[バックエンド]
    ↓ Meet URLをSupabaseに保存
[フロントエンド]
    ↓ Meet URLを表示
```

**実装手順**:

1. **Vercel Functionsを作成**:
   ```javascript
   // api/create-calendar-event.js
   export default async function handler(req, res) {
     const { topic, date, hostEmail } = req.body;
     
     // Google Calendar APIを呼び出し
     const event = {
       summary: topic,
       start: { dateTime: date },
       end: { dateTime: /* date + 1 hour */ },
       conferenceData: {
         createRequest: {
           requestId: `meet-${Date.now()}`,
           conferenceSolutionKey: { type: 'hangoutsMeet' }
         }
       }
     };
     
     const response = await fetch(
       'https://www.googleapis.com/calendar/v3/calendars/primary/events',
       {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${accessToken}`,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify(event)
       }
     );
     
     const result = await response.json();
     const meetUrl = result.hangoutLink;
     
     res.json({ meetUrl });
   }
   ```

2. **フロントエンドから呼び出し**:
   ```javascript
   const response = await fetch('/api/create-calendar-event', {
     method: 'POST',
     body: JSON.stringify({ topic, date, hostEmail })
   });
   const { meetUrl } = await response.json();
   ```

3. **OAuth認証フロー**:
   - Supabase Auth + Google Providerで取得したアクセストークンを使用
   - または、サービスアカウントを使用（推奨）

### Google Drive API統合

PDF資料のアップロード機能も同様にサーバーサイド実装が必要です。

**実装手順**:
1. Vercel Functionsで `/api/upload-pdf` エンドポイントを作成
2. Google Drive APIを呼び出してファイルをアップロード
3. 共有リンクを生成してSupabaseに保存

## 📝 環境変数

現在必要な環境変数:
```bash
VITE_ANTHROPIC_API_KEY=sk-ant-xxx  # Claude API（質問生成用）
VITE_GEMINI_API_KEY=AIzaSyxxx      # Gemini API（アイデア分析用）
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx
```

将来的に必要な環境変数（サーバーサイド）:
```bash
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

## 🎯 次のステップ

1. **Vercelにデプロイ**: `vercel deploy`
2. **Vercel Functionsを追加**: `api/` フォルダを作成
3. **Google Calendar API統合**: サーバーサイド実装
4. **Google Drive API統合**: PDF資料アップロード
5. **テスト**: 実際のセッションで動作確認

## 🐛 既知の問題

- カレンダーイベント自動作成は未実装（手動でMeet URLを入力する必要がある）
- PDF資料アップロードは未実装（ファイル選択のみ可能）
- 参加者のオンライン状態表示は未実装

## 📚 参考リンク

- [Google Calendar API](https://developers.google.com/calendar/api/guides/overview)
- [Google Meet API](https://developers.google.com/meet)
- [Vercel Functions](https://vercel.com/docs/functions)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

## ✅ Google Drive統合（完了）

### Google Drive Picker API

**実装内容**:
- ✅ Google Drive Picker APIをCDN経由で読み込み
- ✅ Googleログイン後、Drive上のPDFファイルを選択可能
- ✅ 選択したファイルのURLをSupabaseに保存
- ✅ クライアントサイドのみで実装（サーバー不要）

**使い方**:
1. 「Office Login」でGoogleアカウントにログイン
2. ホストモードでセッションを作成
3. 「Google DriveからPDFを選択」ボタンをクリック
4. Google Drive Pickerが開き、PDFファイルを選択
5. 選択したファイルのURLがSupabaseに保存される

**必要な環境変数**:
```bash
VITE_GOOGLE_API_KEY=your-google-api-key-here
```

**Google Cloud Console設定**:
1. Google Drive APIを有効化
2. Google Picker APIを有効化
3. APIキーを作成（Credentials → Create Credentials → API Key）
4. OAuth 2.0 Client IDを作成（Supabase用）

### 今後の拡張案

**アップロード機能（将来実装）**:
現在はGoogle Drive上の既存ファイルを選択する方式ですが、将来的にはローカルファイルをDriveにアップロードする機能も追加可能です。

実装方法:
1. Vercel Functionsで `/api/upload-to-drive` エンドポイントを作成
2. `multipart/form-data` でファイルを受信
3. Google Drive APIでアップロード
4. 共有リンクを生成してSupabaseに保存

```javascript
// api/upload-to-drive.js
export default async function handler(req, res) {
  const file = req.files[0];
  
  // Google Drive APIでアップロード
  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: file.name,
        mimeType: 'application/pdf'
      })
    }
  );
  
  const { id } = await response.json();
  const fileUrl = `https://drive.google.com/file/d/${id}/view`;
  
  res.json({ fileUrl });
}
```
