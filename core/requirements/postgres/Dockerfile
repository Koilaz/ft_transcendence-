# Base de l’image.
# On construit notre container à partir d’un système Debian minimal.
FROM debian:bookworm


# Pendant la construction de l’image :
# Docker lance un container temporaire et exécute cette commande.
# Ça installe :
# postgresql


# apt-get clean
# Supprime le cache apt pour alléger l’image.

# rm -rf /var/lib/apt/lists/*
# Nettoie les fichiers apt restants.
# C’est une bonne pratique Docker.
RUN apt-get update && \
    apt-get install -y \
        postgresql \
        postgresql-client \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*


# Copie un fichier depuis ton projet vers l'image Docker.
# source : conf/postgresql.conf 
# destination : /etc/postgresql/postgresql.conf
# Cela signifie que le script sera présent dans le filesystem du container.

COPY tools/entrypoint.sh /usr/local/bin/entrypoint.sh

COPY conf/postgresql.conf /tmp/postgresql.conf

COPY conf/pg_hba.conf /tmp/pg_hba.conf

# Rend le script exécutable.
# chmod + x = autoriser l'exécution du fichier
# sans cela : permission denied
RUN chmod +x /usr/local/bin/entrypoint.sh


# Déclare que Postgresql écoute sur le port :
# 5432
# Ça n’ouvre pas le port vers l’extérieur.
# Ça documente juste le port interne.
EXPOSE 5432

# Définit le programme lancé
# au démarrage du container.
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]



