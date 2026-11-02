#!/bin/bash
set -e

# Lire la clé API Mistral depuis le secret Docker plutôt que le .env.
# tr -d '\n' supprime le retour à la ligne éventuel du fichier.
MISTRAL_API_KEY="$(tr -d '\n' < /run/secrets/mistral_api_key.txt)"

export MISTRAL_API_KEY

echo "Starting game..."

exec node server.js
