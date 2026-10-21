-- Script pour permettre apartment_id NULL dans la table charges
-- Cela permet d'avoir des charges payables par la société sans être liées à un appartement

-- Vérifier si apartment_id a une contrainte NOT NULL et la supprimer si nécessaire
DO $$
BEGIN
  -- Supprimer la contrainte NOT NULL si elle existe
  ALTER TABLE charges ALTER COLUMN apartment_id DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    -- La contrainte n'existe peut-être pas, ce qui est OK
    NULL;
END $$;

-- La fonction RPC update_charge accepte déjà NULL pour p_apartment_id
-- Pas besoin de modification car UUID peut être NULL par défaut





