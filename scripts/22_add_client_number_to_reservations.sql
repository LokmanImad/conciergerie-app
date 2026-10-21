-- Script pour ajouter le champ client_number (numéro de client) à la table reservations
-- Ce champ est optionnel et permet d'enregistrer le numéro de client

-- Ajouter la colonne client_number si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservations' AND column_name = 'client_number'
  ) THEN
    ALTER TABLE reservations ADD COLUMN client_number TEXT;
  END IF;
END $$;





