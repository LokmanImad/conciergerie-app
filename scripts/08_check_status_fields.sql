-- Script de vérification pour diagnostiquer les problèmes avec le champ status

-- Vérifier si le champ status existe dans la table charges
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'charges' AND column_name = 'status'
    ) 
    THEN '✓ Le champ status existe dans la table charges'
    ELSE '✗ Le champ status N''EXISTE PAS dans la table charges - Exécutez scripts/06_add_status_fields.sql'
  END as charges_status_check;

-- Vérifier si le champ status existe dans la table reservations
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'reservations' AND column_name = 'status'
    ) 
    THEN '✓ Le champ status existe dans la table reservations'
    ELSE '✗ Le champ status N''EXISTE PAS dans la table reservations - Exécutez scripts/06_add_status_fields.sql'
  END as reservations_status_check;

-- Afficher les valeurs actuelles du champ status dans charges (si le champ existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'charges' AND column_name = 'status'
  ) THEN
    RAISE NOTICE 'Valeurs du champ status dans charges:';
    PERFORM * FROM charges LIMIT 0; -- Juste pour déclencher le bloc
  ELSE
    RAISE NOTICE 'Le champ status n''existe pas dans charges';
  END IF;
END $$;

-- Vérifier les politiques RLS sur charges
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('charges', 'reservations')
ORDER BY tablename, policyname;






