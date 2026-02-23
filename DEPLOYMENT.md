# Guide de Déploiement - OpenClaw 3D

Ce document décrit la procédure pour déployer les dernières modifications du projet OpenClaw sur le serveur VPS.

## Prérequis

- Avoir accès au réseau privé **Tailscale**.
- Posséder la clé SSH privée `peds.pem` dans le dossier racine du projet local.

## Étapes de Déploiement

1. **Assurez-vous que le réseau Tailscale est actif** sur votre machine locale et que vous êtes bien connecté à votre compte.
   
2. **Connectez-vous au serveur via SSH** en utilisant l'adresse IP Tailscale du VPS Linux (`100.101.199.17`) :
   ```bash
   ssh -i peds.pem -o StrictHostKeyChecking=no root@100.101.199.17
   ```
   *Note : Lors de la première connexion ou après un certain temps, Tailscale peut vous demander de valider la connexion via un lien web généré dans la console (ex: `https://login.tailscale.com/a/...`). Cliquez sur ce lien pour approuver l'accès SSH.*

3. **Accédez au dossier du projet** sur le serveur :
   ```bash
   cd /home/ubuntu/Downloads/openclaw
   ```

4. **Tirez la dernière version du code** depuis la branche principale (main) :
   ```bash
   # Si une erreur de permissions Git (dubious ownership) apparaît, exécutez d'abord :
   # git config --global --add safe.directory /home/ubuntu/Downloads/openclaw

   git pull origin main
   ```

5. **Le déploiement est terminé !** Les modifications seront immédiatement prises en compte par les services en cours d'exécution sur le serveur.
