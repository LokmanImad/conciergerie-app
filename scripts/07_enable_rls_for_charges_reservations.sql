-- Activer RLS sur les tables charges et reservations si ce n'est pas déjà fait
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






