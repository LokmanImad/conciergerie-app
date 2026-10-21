-- Script pour ajouter le champ payment_method (mode de paiement) à la table charges
-- Ce champ permet de distinguer entre les paiements faits à la banque et ceux donnés à la main (en noir)
-- Valeurs possibles: 'bank' (payé à la banque) ou 'cash' (donné à la main)

-- Ajouter la colonne payment_method si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'charges' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE charges ADD COLUMN payment_method TEXT DEFAULT 'bank' CHECK (payment_method IN ('bank', 'cash'));
    RAISE NOTICE 'Colonne payment_method ajoutée à la table charges';
  ELSE
    RAISE NOTICE 'La colonne payment_method existe déjà dans charges';
  END IF;
END $$;

-- Ajouter un commentaire pour documenter
COMMENT ON COLUMN charges.payment_method IS 'Mode de paiement: ''bank'' pour payé à la banque, ''cash'' pour donné à la main (en noir)';
