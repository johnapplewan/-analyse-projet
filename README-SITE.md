# Site GitHub Pages

Page publique : `https://johnapplewan.github.io/-analyse-projet/`

## Mise en route (une fois)
1. **Settings → Pages → Build and deployment → Source : GitHub Actions.**
2. **Settings → Secrets and variables → Actions → New repository secret** : nom `CODE_KEY`, valeur = ton code d'accès.
3. Merge sur `main` : le workflow `Deploy site to GitHub Pages` construit et publie. Changer `CODE_KEY` puis relancer le workflow change le code.

## Choisir la démo
Édite `site/demo.json` (`session` = l'`id` du fichier `sessions/<dossier>/events.json`). Le bouton « Voir la démo » rejoue ce conseil dans la room.

## Limites à connaître
- **Le code d'accès est une barrière douce.** Un site statique ne peut pas garder de secret : le navigateur reçoit un hash salé de `CODE_KEY` (jamais le code). Un code court peut être retrouvé par force brute hors ligne. Utilise un code long et aléatoire (16 caractères ou plus), et ne mets rien de confidentiel derrière.
- **Rien n'est analysé en direct sur le site.** Sans clé API ni serveur, le site ne peut que rejouer des conseils déjà faits. L'analyse réelle tourne dans Claude Code (`/analyse-projet`), sur ton compte. L'écran après le code donne la commande à lancer.
- **Tout ce qui est dans `sessions/*/events.json` est public** (c'est ce que la démo rejoue).
- Pour un vrai verrou côté serveur, il faudrait une fonction (Vercel ou Cloudflare Worker) qui vérifie `CODE_KEY`.

## Tester en local
```bash
CODE_KEY=un-code-de-test node site/build.mjs   # génère dist/
```
Sers `dist/` derrière un sous-dossier `/-analyse-projet/` pour reproduire GitHub Pages.
