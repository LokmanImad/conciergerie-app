-- Script pour ajouter le champ payment_method (mode de paiement) à la table reservations
-- Ce champ permet de distinguer entre les paiements reçus à la banque et ceux donnés à la main (en noir)
-- Valeurs possibles: 'bank' (reçu à la banque) ou 'cash' (donné à la main)

-- Ajouter la colonne payment_method si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reservations' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE reservations ADD COLUMN payment_method TEXT DEFAULT 'bank' CHECK (payment_method IN ('bank', 'cash'));
    RAISE NOTICE 'Colonne payment_method ajoutée à la table reservations';
  ELSE
    RAISE NOTICE 'La colonne payment_method existe déjà dans reservations';
  END IF;
END $$;

-- Ajouter un commentaire pour documenter
COMMENT ON COLUMN reservations.payment_method IS 'Mode de paiement: ''bank'' pour reçu à la banque, ''cash'' pour donné à la main (en noir)';
