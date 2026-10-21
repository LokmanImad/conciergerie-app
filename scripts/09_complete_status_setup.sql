-- ============================================
-- SCRIPT COMPLET POUR AJOUTER LE CHAMP STATUS
-- ============================================
-- Exécutez ce script dans Supabase SQL Editor
-- Ce script ajoute le champ status et configure les permissions

-- ============================================
-- PARTIE 1: Ajouter le champ status aux tables
-- ============================================

-- Ajouter le champ status à la table charges
-- Statuts possibles: 'pending' (en attente), 'paid' (payé), 'invoiced' (facturé)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'charges' AND column_name = 'status'
  ) THEN
    ALTER TABLE charges ADD COLUMN status TEXT DEFAULT 'pending';
    RAISE NOTICE 'Champ status ajouté à la table charges';
  ELSE
    RAISE NOTICE 'Le champ status existe déjà dans la table charges';
  END IF;
  
  -- Ajouter la contrainte si elle n'existe pas déjà
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'charges_status_check'
  ) THEN
    ALTER TABLE charges ADD CONSTRAINT charges_status_check 
      CHECK (status IN ('pending', 'paid', 'invoiced'));
    RAISE NOTICE 'Contrainte charges_status_check ajoutée';
  ELSE
    RAISE NOTICE 'La contrainte charges_status_check existe déjà';
  END IF;
END $$;

-- Ajouter le champ status à la table reservations
-- Statuts possibles: 'pending' (en attente), 'invoiced' (facturé)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservations' AND column_name = 'status'
  ) THEN
    ALTER TABLE reservations ADD COLUMN status TEXT DEFAULT 'pending';
    RAISE NOTICE 'Champ status ajouté à la table reservations';
  ELSE
    RAISE NOTICE 'Le champ status existe déjà dans la table reservations';
  END IF;
  
  -- Ajouter la contrainte si elle n'existe pas déjà
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'reservations_status_check'
  ) THEN
    ALTER TABLE reservations ADD CONSTRAINT reservations_status_check 
      CHECK (status IN ('pending', 'invoiced'));
    RAISE NOTICE 'Contrainte reservations_status_check ajoutée';
  ELSE
    RAISE NOTICE 'La contrainte reservations_status_check existe déjà';
  END IF;
END $$;

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_charges_status ON charges(status);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

-- ============================================
-- PARTIE 2: Configurer les permissions RLS
-- ============================================

-- Activer RLS sur les tables charges et reservations
ALTER TABLE charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Allow all operations on charges" ON charges;
DROP POLICY IF EXISTS "Allow all operations on reservations" ON reservations;

-- Créer des politiques pour permettre toutes les opérations sur charges
CREATE POLICY "Allow all operations on charges" ON charges 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Créer des politiques pour permettre toutes les opérations sur reservations
CREATE POLICY "Allow all operations on reservations" ON reservations 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- ============================================
-- VÉRIFICATION
-- ============================================
-- Vérifier que les champs ont été ajoutés
SELECT 
  'charges' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'charges' AND column_name = 'status'
    ) 
    THEN '✓ Champ status existe'
    ELSE '✗ Champ status MANQUANT'
  END as status_check
UNION ALL
SELECT 
  'reservations' as table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'reservations' AND column_name = 'status'
    ) 
    THEN '✓ Champ status existe'
    ELSE '✗ Champ status MANQUANT'
  END as status_check;

-- Afficher un message de succès
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SCRIPT TERMINÉ AVEC SUCCÈS!';
  RAISE NOTICE 'Les champs status ont été ajoutés.';
  RAISE NOTICE 'Vous pouvez maintenant utiliser les boutons Payer et Facturer.';
  RAISE NOTICE '========================================';
END $$;






