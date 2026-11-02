FROM debian:bookworm

RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY app/package*.json ./

RUN npm install

COPY app .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]