#!/bin/bash
set -e

# Lire le mot de passe PostgreSQL depuis le secret Docker.
# j'avais a nouveau besoin du password car sinon le container Backend croyait que postgresql etait demarrer alors qu'il etait en demarrage de test et pas reellement demarrer
# parce que le port 5432 est ouvert pendant le démarrage temporaire.


# tr -d '\n' supprime le retour à la ligne éventuel du fichier.
POSTGRES_PASSWORD="$(tr -d '\n' < /run/secrets/postgres_password.txt)"

JWT_SECRET="$(tr -d '\n' < /run/secrets/jwt_secret.txt)"

# psql utilise PGPASSWORD pour tester la connexion à PostgreSQL.
export PGPASSWORD="$POSTGRES_PASSWORD"

export JWT_SECRET

# Prisma utilise DATABASE_URL pour se connecter à PostgreSQL.
# Le mot de passe reste dans le secret Docker et n'est jamais écrit dans Git.
export DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}"

# Garantir l'existence du dossier d'upload dans le volume Docker.
mkdir -p /app/uploads/avatars

echo "Waiting for PostgreSQL..."

until psql \
    -h postgres \
    -U "$POSTGRES_USER" \
    -d "$POSTGRES_DB" \
    -c "SELECT 1" >/dev/null 2>&1
do
    echo "PostgreSQL is unavailable - waiting"
    sleep 1
done

echo "PostgreSQL is ready"

# Appliquer toutes les migrations Prisma qui n'ont pas encore été exécutées.
# migrate deploy lit les fichiers présents dans prisma/migrations/
# et ne modifie pas le schéma Prisma lui-même.
echo "Applying Prisma migrations..."
npx prisma migrate deploy

echo "Starting backend..."

exec npm run start:prod