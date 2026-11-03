# secrets/

Ces fichiers sont montés en lecture seule sur `/run/secrets` dans les
containers (`docker-compose.yml`) et lus par `requirements/*/tools/entrypoint.sh`,
par les scripts de `requirements/{grafana,elasticsearch,kibana}/` et par les
`entrypoint` de `elasticsearch`, `logstash` et `kibana` dans le compose.
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
openssl rand -hex 24
```
> En `-hex` et pas en `-base64` : le mot de passe est injecté tel quel dans
> `DATABASE_URL`, et le base64 peut produire un `/` qui casse l'URL.

### jwt_secret.txt
Clé de signature des JWT. À générer soi-même :
```bash
openssl rand -hex 32
```

### mistral_api_key.txt
Clé API Mistral. À obtenir sur [console.mistral.ai](https://console.mistral.ai) → API Keys → créer une nouvelle clé.

### grafana_admin_password.txt, elastic_password.txt, logstash_password.txt, kibana_password.txt
Mots de passe de l'admin Grafana, du superutilisateur `elastic`, du compte
`logstash_internal` et du compte `kibana_system`. À générer soi-même :
```bash
openssl rand -hex 24
```
> Grafana et Elasticsearch gardent dans leur volume le mot de passe du premier
> démarrage : changer `grafana_admin_password.txt` ou `elastic_password.txt`
> ensuite demande de supprimer le volume `grafana_data` ou `elasticsearch_data`.
> Les mots de passe Logstash et Kibana sont réappliqués à chaque démarrage par
> `elasticsearch-init`.

### kibana_security_encryption_key.txt, kibana_saved_objects_encryption_key.txt, kibana_reporting_encryption_key.txt
Clés de chiffrement de Kibana, **32 caractères minimum** sinon Kibana refuse de
démarrer. À générer soi-même :
```bash
openssl rand -hex 32
```

### grafana_discord_webhook.txt
URL du webhook Discord des alertes Grafana. Optionnel : laisser le fichier vide
pour désactiver les notifications Discord.
