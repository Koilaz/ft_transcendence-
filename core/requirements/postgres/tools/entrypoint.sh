#!/bin/bash
set -e

# Le shebang -> #!/bin/bash
# Ça veut dire :
# exécuter ce script avec bash.
# Sans ça, Linux ne saurait pas quel interpréteur utiliser.

# set -e -> si une commande échoue, le script s'arrête immédiatement.
# C’est très important pour éviter :
# - une base partiellement créée
# - un utilisateur SQL mal configuré
# - un container qui continue malgré une erreur.



# Ici, le script lit le fichier secret contenant
# le mot de passe PostgreSQL.
#
# tr -d '\n'
# enlève le retour à la ligne.
#
# 2>/dev/null
# masque les erreurs.
#
# || true
# évite que set -e arrête immédiatement le script
# si le fichier n'existe pas.
#
# Le script fera les vérifications juste après.

POSTGRES_PASSWORD="$(tr -d '\n' < /run/secrets/postgres_password.txt 2>/dev/null || true)"



# On vérifie que dans notre .env
# les variables suivantes existent :
#
# POSTGRES_DB
# POSTGRES_USER
#
# -z signifie :
# la variable est vide.
#
# if = début de condition
# then = début du bloc exécuté si la condition est vraie
# fi = fin du bloc if.

if [ -z "$POSTGRES_DB" ] || [ -z "$POSTGRES_USER" ]; then
    echo "ERROR : POSTGRES_DB ou POSTGRES_USER manquant (.env)"
    exit 1
fi



# Même logique pour le mot de passe.
# Ici, il est stocké dans Docker Secrets
# plutôt que directement dans le .env.

if [ -z "$POSTGRES_PASSWORD" ]; then
    echo "ERROR : secret postgres_password.txt manquant"
    exit 1
fi



# PGDATA indique à PostgreSQL
# où se trouve le dossier contenant :
#
# - les bases de données
# - les fichiers de configuration
# - les logs
# - les fichiers internes
#
# C'est l'équivalent de :
#
# /var/lib/mysql
#
# pour MariaDB.

export PGDATA="/var/lib/postgresql/data"



# Affichage des informations.
#
# Pour le moment, on veut uniquement vérifier
# que les variables sont correctement récupérées.
#
# La création automatique de la base,
# des utilisateurs et des droits
# sera ajoutée dans une seconde version
# du script.

echo "==========================================="
echo "PostgreSQL configuration"
echo "==========================================="
echo ""
echo "Database : $POSTGRES_DB"
echo "User     : $POSTGRES_USER"
echo ""












# Vérifier si PostgreSQL a déjà été initialisé.
#
# PG_VERSION est un fichier créé automatiquement
# par la commande initdb.
#
# S'il n'existe pas,
# cela signifie que PostgreSQL démarre
# pour la toute première fois.
#
# On initialise alors le dossier de données.


if [ ! -f "$PGDATA/PG_VERSION" ]; then

    echo "Initializing PostgreSQL data directory..."

    # Crée le dossier de données s'il n'existe pas.
    mkdir -p "$PGDATA"

    # Donne les droits à l'utilisateur postgres.
    chown -R postgres:postgres "$PGDATA"

    # Initialise la structure interne de PostgreSQL.
    su - postgres -c "/usr/lib/postgresql/15/bin/initdb -D $PGDATA"

    # Remplace le fichier de configuration généré
    # automatiquement par initdb
    # par notre propre configuration.

    cp /tmp/postgresql.conf "$PGDATA/postgresql.conf"

    # PostgreSQL doit rester propriétaire
    # de son fichier de configuration.

    chown postgres:postgres "$PGDATA/postgresql.conf"



    cp /tmp/pg_hba.conf "$PGDATA/pg_hba.conf"
    chown postgres:postgres "$PGDATA/pg_hba.conf"



    echo "Starting PostgreSQL temporarily for setup..."

    su - postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D $PGDATA -w start"



    echo "Configuring database and user..."

    su - postgres -c "psql -c \"CREATE USER $POSTGRES_USER WITH PASSWORD '$POSTGRES_PASSWORD';\""
    su - postgres -c "psql -c \"CREATE DATABASE $POSTGRES_DB OWNER $POSTGRES_USER;\""
    su - postgres -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;\""



    echo "Stopping temporary PostgreSQL..."

    su - postgres -c "/usr/lib/postgresql/15/bin/pg_ctl -D $PGDATA -m fast -w stop"


fi



# Démarrage final.
#
# exec remplace le shell courant
# par le processus PostgreSQL.
#
# Donc :
#
# PID 1 du container = postgres
#
# C'est très important pour Docker.
#
# Sans exec :
#
# PID 1 = bash
# PID 2 = postgres
#
# Docker gérerait moins bien :
#
# - les signaux
# - l'arrêt du container
# - certains comportements système.

echo "Starting PostgreSQL..."

exec su - postgres -c "/usr/lib/postgresql/15/bin/postgres -D $PGDATA"