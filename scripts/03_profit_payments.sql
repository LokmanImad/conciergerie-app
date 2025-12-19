-- Table pour stocker les paiements de bénéfices
CREATE TABLE IF NOT EXISTS profit_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_profit DECIMAL(10, 2) NOT NULL,
  imad_share DECIMAL(10, 2) NOT NULL,
  jassem_share DECIMAL(10, 2) NOT NULL,
  imad_paid BOOLEAN DEFAULT FALSE,
  jassem_paid BOOLEAN DEFAULT FALSE,
  imad_payment_date TIMESTAMPTZ,
  jassem_payment_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour la configuration des périodes de paiement
CREATE TABLE IF NOT EXISTS payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_frequency_months INTEGER DEFAULT 3,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insérer la configuration par défaut (tous les 3 mois)
INSERT INTO payment_settings (payment_frequency_months)
VALUES (3)
ON CONFLICT DO NOTHING;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_profit_payments_period ON profit_payments(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_profit_payments_created ON profit_payments(created_at DESC);

-- Activer RLS
ALTER TABLE profit_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre toutes les opérations (temporaire, ajustez selon vos besoins)
CREATE POLICY "Allow all operations on profit_payments" ON profit_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on payment_settings" ON payment_settings FOR ALL USING (true) WITH CHECK (true);
