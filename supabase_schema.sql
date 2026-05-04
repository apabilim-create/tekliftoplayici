-- =============================================
-- Teklif Yönetim Sistemi - Supabase Şeması
-- =============================================

-- 1. Firma Bilgileri Tablosu
CREATE TABLE IF NOT EXISTS firma_bilgileri (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  firma_ismi TEXT NOT NULL,
  mail TEXT NOT NULL UNIQUE,
  telefon TEXT,
  vergi_no TEXT,
  sifre TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Teklif Al (Talepler) Tablosu
CREATE TABLE IF NOT EXISTS teklif_al (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  firma_id UUID NOT NULL REFERENCES firma_bilgileri(id) ON DELETE CASCADE,
  urun_ismi TEXT,
  marka TEXT,
  adet INTEGER,
  son_teklif_tarihi DATE,
  durum TEXT DEFAULT 'Açık',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Teklif Ver (Teklifler) Tablosu
CREATE TABLE IF NOT EXISTS teklif_ver (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  teklif_al_id UUID NOT NULL REFERENCES teklif_al(id) ON DELETE CASCADE,
  veren_firma_id UUID NOT NULL REFERENCES firma_bilgileri(id) ON DELETE CASCADE,
  urun_ismi TEXT,
  marka TEXT,
  adet INTEGER,
  birim_fiyat NUMERIC,
  toplam_fiyat NUMERIC,
  notlar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_teklif_al_firma ON teklif_al(firma_id);
CREATE INDEX IF NOT EXISTS idx_teklif_ver_firma ON teklif_ver(veren_firma_id);
CREATE INDEX IF NOT EXISTS idx_teklif_ver_talep ON teklif_ver(teklif_al_id);

-- RLS (Row Level Security) - Opsiyonel
-- Eğer Supabase Auth kullanılacaksa aktif edilebilir
-- ALTER TABLE firma_bilgileri ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE teklif_al ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE teklif_ver ENABLE ROW LEVEL SECURITY;
