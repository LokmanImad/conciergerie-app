# Solution pour l'erreur "needs_second_factor"

## Le problème

Clerk demande une authentification à deux facteurs (2FA) à cause de la fonctionnalité "Client Trust" qui est activée. Cela se produit quand vous vous connectez depuis un nouvel appareil/navigateur.

## Solution 1 : Désactiver Client Trust (Recommandé pour le développement)

1. Allez dans Clerk Dashboard → **Settings** → **User & Authentication**
2. Cliquez sur l'onglet **Password**
3. Trouvez la section **"Client Trust"**
4. Désactivez le toggle **"Client Trust"** (mettez-le sur OFF)
5. Sauvegardez les changements

Cela permettra de se connecter directement avec email/mot de passe sans demander de second facteur.

## Solution 2 : Configurer le 2FA dans le code (Optionnel)

Si vous voulez garder Client Trust activé, il faudra implémenter la gestion du 2FA dans le code, ce qui est plus complexe.

## Après avoir désactivé Client Trust

1. Redémarrez votre serveur de développement
2. Essayez de vous connecter à nouveau
3. La connexion devrait fonctionner directement






