-- ============================================================
-- QUANTUM TRADE ANALYSIS ENGINE — SUPABASE MIGRATION
-- DeepTradeScan v2.0
-- Supabase SQL Editor'da çalıştırın
-- ============================================================

-- 1. quantum_analyses tablosu
CREATE TABLE IF NOT EXISTS quantum_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'full',
  signal_direction TEXT NOT NULL DEFAULT 'WAIT',
  confidence NUMERIC(5,2) DEFAULT 0,
  setup_quality TEXT DEFAULT 'NO_TRADE',
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_direction CHECK (signal_direction IN ('LONG', 'SHORT', 'WAIT')),
  CONSTRAINT valid_quality CHECK (setup_quality IN ('A+', 'A', 'B', 'NO_TRADE'))
);

CREATE INDEX IF NOT EXISTS idx_quantum_user_id ON quantum_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_quantum_symbol ON quantum_analyses(symbol);
CREATE INDEX IF NOT EXISTS idx_quantum_created ON quantum_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quantum_signal ON quantum_analyses(signal_direction);

-- 2. profiles tablosuna quantum alanları ekle
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS quantum_analyses_today INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_quantum_date DATE;

-- 3. RLS politikaları
ALTER TABLE quantum_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quantum analyses" ON quantum_analyses;
CREATE POLICY "Users can view own quantum analyses" ON quantum_analyses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage quantum" ON quantum_analyses;
CREATE POLICY "Service role can manage quantum" ON quantum_analyses
  FOR ALL USING (true)
  WITH CHECK (true);

-- 4. Günlük quantum quota reset fonksiyonu
CREATE OR REPLACE FUNCTION reset_daily_quantum_quota()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET quantum_analyses_today = 0
  WHERE last_quantum_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Plan bazlı quantum limitlerini profiles tablosuna sync et
-- (Opsiyonel: trigger ile otomatik sync)
CREATE OR REPLACE FUNCTION sync_quantum_limits()
RETURNS TRIGGER AS $$
BEGIN
  -- Plan değişince quantum limiti güncelle
  IF NEW.plan = 'elite' THEN
    NEW.quantum_analyses_today := COALESCE(NEW.quantum_analyses_today, 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Quantum istatistikleri view
CREATE OR REPLACE VIEW quantum_stats AS
SELECT
  symbol,
  COUNT(*) as total_analyses,
  AVG(confidence) as avg_confidence,
  COUNT(CASE WHEN signal_direction = 'LONG' THEN 1 END) as long_count,
  COUNT(CASE WHEN signal_direction = 'SHORT' THEN 1 END) as short_count,
  COUNT(CASE WHEN signal_direction = 'WAIT' THEN 1 END) as wait_count,
  COUNT(CASE WHEN setup_quality = 'A+' THEN 1 END) as aplus_count,
  MAX(created_at) as last_analysis
FROM quantum_analyses
GROUP BY symbol
ORDER BY total_analyses DESC;

-- ============================================================
-- ÇALIŞTIRMA SONRASI KONTROL
-- ============================================================
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'quantum_analyses';
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name LIKE 'quantum%';
