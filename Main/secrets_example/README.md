# secrets/

Ces fichiers sont montés en lecture seule sur `/run/secrets` dans les
containers (`docker-compose.yml`) et lus par `requirements/*/tools/entrypoint.sh`.
`secrets/*.txt` est gitignored : ne jamais committer de vraies valeurs.

## Setup

```bash
cp -r secrets_example secrets
```

Puis remplacer le contenu de chaque fichier ci-dessous. Une seule valeur brute
par fichier, pas de `KEY=`, pas de guillemets.

## Fichiers

### postgres_password.txt
Mot de passe de `POSTGRES_USER`. À générer soi-même :
```bash
openssl rand -base64 24
```

### jwt_secret.txt
Clé de signature des JWT. À générer soi-même :
```bash
openssl rand -hex 32
```

### mistral_api_key.txt
Clé API Mistral. À obtenir sur [console.mistral.ai](https://console.mistral.ai) → API Keys → créer une nouvelle clé.
