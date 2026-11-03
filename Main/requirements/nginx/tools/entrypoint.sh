#!/bin/bash
set -e

# A shared, query-free access log for Prometheus and Logstash readers.
mkdir -p /var/log/nginx
touch /var/log/nginx/traffic.json
chmod 644 /var/log/nginx/traffic.json

# Créer le dossier qui contiendra les certificats TLS.
# Si le dossier existe déjà, mkdir ne renverra pas d'erreur grâce au -p.
mkdir -p /etc/nginx/ssl

# Vérifier si un certificat TLS existe déjà.
# Si ce n'est pas le cas, on le génère automatiquement.
#
# Cela évite de recréer un nouveau certificat
# à chaque démarrage du container.
if [ ! -f /etc/nginx/ssl/nginx.crt ] || [ ! -f /etc/nginx/ssl/nginx.key ]; then

    # Créer un certificat TLS auto-signé.
    # -addext subjectAltName : les navigateurs modernes ignorent le CN et
    # exigent un SAN. Sans lui, Chrome affiche ERR_CERT_COMMON_NAME_INVALID
    # et fait revenir l'avertissement, ce qui casse aussi le WebSocket de
    # presence (wss n'a pas de dialogue d'acceptation, cf. conf nginx).
    openssl req -x509 -nodes -days 365 \
        -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/nginx.key \
        -out /etc/nginx/ssl/nginx.crt \
        -subj "/C=FR/ST=France/L=Paris/O=42/OU=Transcendence/CN=$DOMAIN_NAME" \
        -addext "subjectAltName=DNS:$DOMAIN_NAME,DNS:localhost,IP:127.0.0.1"
fi

# Vérifier que la configuration nginx est valide.
# Si nginx.conf contient une erreur,
# le container s'arrêtera immédiatement.
nginx -t

# Lancer nginx au premier plan.
# Important :
# daemon off sinon nginx passerait en arrière-plan
# et le container Docker s'arrêterait immédiatement.
exec nginx -g "daemon off;"










# crée un certificat :
# openssl req

# certificat auto-signé :
# -x509

# pas de mot de passe :
# -nodes

# valide pendant 1 an :
# -days 365

# génère une nouvelle clé RSA de 2048 bits :
# -newkey rsa:2048

# fichiers générés :

# /etc/nginx/ssl/nginx.key
# -> clé privée

# /etc/nginx/ssl/nginx.crt
# -> certificat public

# sujet du certificat :

# -subj "/C=FR/.../CN=$DOMAIN_NAME"

# CN = Common Name

# Dans notre cas, il correspond au nom de domaine
# défini dans le fichier .env.

# Exemple :

# DOMAIN_NAME=mwallis.42.fr

# OU = Organizational Unit

# Ici nous indiquons simplement que
# le certificat est généré pour le projet
# ft_transcendence.

# Vérification de la configuration :

# nginx -t

# Cette commande demande à nginx de vérifier
# que le fichier nginx.conf est valide.

# Si une erreur est détectée :

# mauvaise syntaxe
# fichier manquant
# directive inconnue

# nginx refuse de démarrer.

# Cela évite de lancer un container
# avec une configuration invalide.

# lancement nginx :

# nginx -g "daemon off;"

# Important :

# nginx tourne normalement en arrière-plan (daemon).

# Docker considère qu'un container est vivant
# uniquement tant que son processus principal est actif.

# "daemon off;" force nginx à rester
# au premier plan.

# Sans cette option,
# nginx se lancerait puis quitterait immédiatement,
# ce qui arrêterait le container Docker.
