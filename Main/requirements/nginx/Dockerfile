# Image de base.
# Docker télécharge Debian Bookworm depuis le registre Docker
# si elle n'est pas déjà présente localement.
FROM debian:bookworm

# Installation des paquets nécessaires.
# nginx   -> Reverse Proxy / Serveur Web
# openssl -> Génération du certificat TLS auto-signé
RUN apt-get update && apt-get install -y \
    nginx \
    openssl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Création du dossier qui contiendra les certificats TLS.
RUN mkdir -p /etc/nginx/ssl

# Copie de la configuration nginx.
COPY conf/nginx.conf /etc/nginx/nginx.conf

# Copie du script lancé au démarrage du container.
COPY tools/entrypoint.sh /usr/local/bin/entrypoint.sh

# Rend le script exécutable.
RUN chmod +x /usr/local/bin/entrypoint.sh

# Le container écoute sur le port HTTPS.
EXPOSE 443

# Lance le script d'initialisation puis nginx.
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]