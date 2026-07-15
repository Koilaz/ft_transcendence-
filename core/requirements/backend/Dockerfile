FROM debian:bookworm

RUN apt-get update && \
    apt-get install -y \
        curl \
        ca-certificates \
        gnupg \
        netcat-openbsd \
        postgresql-client \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN mkdir -p /app/uploads/avatars

COPY app/package*.json ./

RUN npm install --legacy-peer-deps

COPY app .

# On ne peut pas faire pour generer prisma notre ORM :
# RUN npx prisma generate
# car prisma generate a besoin de lire le schéma et de générer le client. Il doit connaitre DATABASE_URL qui est dans notre entrypoint plus tard
# La vraie DATABASE_URL sera toujours créée proprement au démarrage par le entrypoint.sh avec le secret Docker.
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

RUN npm run build

COPY tools/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]