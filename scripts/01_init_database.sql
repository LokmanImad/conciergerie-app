-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table pour les utilisateurs (membres de l'équipe)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin' ou 'member'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les appartements
CREATE TABLE IF NOT EXISTS apartments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  owner_contact TEXT,
  commission_rate DECIMAL(5, 2) DEFAULT 25.00, -- Pourcentage de commission (25%)
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les types de services/charges (définit qui paie)
CREATE TABLE IF NOT EXISTS service_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE, -- ex: "Ménage", "Maintenance", "Gasoil", etc.
  description TEXT,
  paid_by TEXT NOT NULL DEFAULT 'company', -- 'company' ou 'owner'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les charges
CREATE TABLE IF NOT EXISTS charges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  service_type_id UUID REFERENCES service_types(id),
  amount DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  paid_by_person TEXT, -- 'imad', 'jassem', ou 'company'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les réservations
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les portefeuilles (Imad et Jassem)
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_name TEXT NOT NULL UNIQUE, -- 'imad' ou 'jassem'
  balance DECIMAL(10, 2) DEFAULT 0.00,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insérer les portefeuilles initiaux
INSERT INTO wallets (person_name, balance) 
VALUES 
  ('imad', 0.00),
  ('jassem', 0.00)
ON CONFLICT (person_name) DO NOTHING;

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_charges_apartment ON charges(apartment_id);
CREATE INDEX IF NOT EXISTS idx_charges_date ON charges(date);
CREATE INDEX IF NOT EXISTS idx_reservations_apartment ON reservations(apartment_id);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON reservations(check_in, check_out);

-- Fonction pour mettre à jour le timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement updated_at
CREATE TRIGGER update_apartments_updated_at BEFORE UPDATE ON apartments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
