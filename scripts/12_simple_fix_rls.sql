-- ============================================
-- SCRIPT SIMPLE POUR CORRIGER LES PERMISSIONS RLS
-- ============================================
-- Exécutez ce script dans Supabase SQL Editor
-- Il va corriger les permissions pour permettre les modifications

-- Désactiver RLS temporairement (solution la plus simple)
ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
ALTER TABLE charges DISABLE ROW LEVEL SECURITY;
ALTER TABLE apartments DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_types DISABLE ROW LEVEL SECURITY;

-- OU si vous préférez garder RLS activé, utilisez cette partie à la place:
/*
-- Activer RLS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Allow all operations on reservations" ON reservations;
DROP POLICY IF EXISTS "Allow all operations on charges" ON charges;
DROP POLICY IF EXISTS "Allow all operations on apartments" ON apartments;
DROP POLICY IF EXISTS "Allow all operations on service_types" ON service_types;

-- Créer des politiques permissives
CREATE POLICY "Allow all operations on reservations" ON reservations 
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on charges" ON charges 
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on apartments" ON apartments 
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on service_types" ON service_types 
FOR ALL USING (true) WITH CHECK (true);
*/






