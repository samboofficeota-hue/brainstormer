-- =====================================
-- 集団ブレインストーミングアプリ
-- データベーススキーマ
-- =====================================

-- セッションテーブル
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  background TEXT,
  current_situation TEXT,
  challenge TEXT,
  host_name TEXT NOT NULL,
  host_password_hash TEXT NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  meet_url TEXT,
  pdf_url TEXT,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'analyzing', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 参加者テーブル
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('host', 'guest')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_online BOOLEAN DEFAULT true,
  UNIQUE(session_id, name)
);

-- アイデアテーブル
CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- メッセージテーブル（チャット）
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'user' CHECK (type IN ('user', 'ai')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AIマッピング結果テーブル
CREATE TABLE IF NOT EXISTS mapping_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  clusters JSONB NOT NULL,
  key_points JSONB NOT NULL,
  new_insights JSONB,
  type TEXT NOT NULL CHECK (type IN ('initial', 'remapped')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ディスカッション議事録テーブル
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_scheduled_date ON sessions(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_participants_session ON participants(session_id);
CREATE INDEX IF NOT EXISTS idx_ideas_session ON ideas(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_mapping_results_session ON mapping_results(session_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_session ON transcripts(session_id);

-- Row Level Security (RLS) を有効化
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE mapping_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 全員が読み取り可能
CREATE POLICY "Anyone can read sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can read participants" ON participants FOR SELECT USING (true);
CREATE POLICY "Anyone can read ideas" ON ideas FOR SELECT USING (true);
CREATE POLICY "Anyone can read messages" ON messages FOR SELECT USING (true);
CREATE POLICY "Anyone can read mapping_results" ON mapping_results FOR SELECT USING (true);
CREATE POLICY "Anyone can read transcripts" ON transcripts FOR SELECT USING (true);

-- RLSポリシー: 全員が書き込み可能（認証なしでも）
CREATE POLICY "Anyone can insert sessions" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert participants" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert ideas" ON ideas FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert messages" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert mapping_results" ON mapping_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert transcripts" ON transcripts FOR INSERT WITH CHECK (true);

-- RLSポリシー: 更新・削除（将来的にホストのみに制限）
CREATE POLICY "Anyone can update sessions" ON sessions FOR UPDATE USING (true);
CREATE POLICY "Anyone can update participants" ON participants FOR UPDATE USING (true);
CREATE POLICY "Anyone can update transcripts" ON transcripts FOR UPDATE USING (true);

-- リアルタイム同期を有効化
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE ideas;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE mapping_results;
ALTER PUBLICATION supabase_realtime ADD TABLE transcripts;

-- サンプルデータ挿入
INSERT INTO sessions (title, description, background, current_situation, challenge, host_name, host_password_hash, scheduled_date, status)
VALUES 
  ('地域コミュニティの活性化', '地域住民が交流できる新しい仕組みを考えます', '高齢化と人口減少により...', '現在は月1回のイベント開催', '参加者が固定化している', '山田太郎', 'host123', '2026-04-10 12:00:00+09', 'upcoming'),
  ('教育現場でのAI活用', '学校や教育機関でAIを効果的に使う方法', 'AIツールの普及により...', '一部の教員が試験的に導入', '全体的な活用方針が未定', '佐藤花子', 'host123', '2026-04-17 12:00:00+09', 'upcoming'),
  ('環境に優しい生活習慣', 'サステナブルな暮らし方のアイデア', '気候変動への対応として...', '個人レベルでの取り組み', '継続的な実践が難しい', '鈴木一郎', 'host123', '2026-04-24 12:00:00+09', 'upcoming');
