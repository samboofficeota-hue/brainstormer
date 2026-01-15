-- お題作成フォームの新しいフィールドを追加するマイグレーション

-- 既存のカラムを削除（不要になったフィールド）
ALTER TABLE sessions
DROP COLUMN IF EXISTS background,
DROP COLUMN IF EXISTS current_situation,
DROP COLUMN IF EXISTS challenge,
DROP COLUMN IF EXISTS scheduled_date,
DROP COLUMN IF EXISTS host_password_hash;

-- 新しいカラムを追加
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS goal TEXT,
ADD COLUMN IF NOT EXISTS question1 TEXT,
ADD COLUMN IF NOT EXISTS question2 TEXT,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- descriptionカラムのコメントを更新
COMMENT ON COLUMN sessions.description IS '概要';
COMMENT ON COLUMN sessions.goal IS '目指したいこと';
COMMENT ON COLUMN sessions.question1 IS '問い①';
COMMENT ON COLUMN sessions.question2 IS '問い②';
COMMENT ON COLUMN sessions.start_date IS '開催開始日';
COMMENT ON COLUMN sessions.end_date IS '開催終了日';
