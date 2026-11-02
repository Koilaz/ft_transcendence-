# Retours d'intégration DevOps — branche `integ/devops-mlavry`

Intégration du commit `e929a55` (« Devops version need to merge », branche `mlavry`) sur `dev` (`e4e58f9`), testée le 2026-11-02 sur un Docker vide (volumes neufs), stack complète sauf Ollama.

Destinataires : l'agent de Mlavry et le responsable DevOps. Les chemins sont donnés côté dev (`Main/requirements/…`) ; dans la branche `mlavry`, retirer le préfixe `Main/`.

## En bref

| Composant | État | Détail |
|---|---|---|
| Prometheus | OK | cibles `backend` (`/api/metrics`) et `postgres` (exporter) à `up`, `pg_up = 1` |
| Grafana | OK | 2 dashboards v2 provisionnés, 3 alertes (au repos), contact point Discord, datasource OK, requêtes des panneaux avec données |
| Backend → Logstash → Elasticsearch | OK | index `transcendence-logs-AAAA.MM.JJ` alimenté, politique ILM appliquée, aucun échec d'envoi |
| Kibana | **KO** | bugs 1 et 2 ci-dessous, non corrigés dans la branche |
| Webhook Discord vide | **bloquant** | Grafana refuse de démarrer, voir plus bas |

Correctifs proposés pour les bugs 1 et 2 : vérifiés à la main, sans modifier les fichiers. Sur la machine d'intégration, Kibana fonctionne donc **uniquement** parce que le mot de passe `kibana_system` y a été défini à la main ; un volume neuf reproduit les deux bugs.

## Bug 1 — Kibana ne se connecte jamais à Elasticsearch sur un volume neuf

**Symptôme observé** : Kibana reste bloqué en mode « preboot ». Ses logs bouclent sur :

```
[ERROR][elasticsearch-service] Unable to retrieve version information from Elasticsearch nodes. security_exception
    security_exception: unable to authenticate user [kibana_system] for REST request [/_nodes/_all/_none?filter_path=...]
```

Depuis le navigateur, `https://localhost:8443/kibana/api/status` répond 503 et `/kibana/` finit en 504 (timeout nginx après 60 s).

**Cause** : `docker-compose.yml`, service `kibana` (lignes 166-167), Kibana se connecte avec `kibana_system` / `${KIBANA_PASSWORD}`. Or l'image Elasticsearch n'initialise que le mot de passe de `elastic` (via `ELASTIC_PASSWORD`), et **aucun script ne définit celui de `kibana_system`** : `init-elasticsearch.sh` crée la politique ILM, le template, le dépôt et la politique de snapshots, puis le rôle et l'utilisateur Logstash, mais jamais `kibana_system`. Si ça a fonctionné chez toi, c'est sans doute que ton volume `elasticsearch_data` contenait déjà un mot de passe défini à la main.

**Correctif proposé** — `Main/requirements/elasticsearch/init-elasticsearch.sh`, après `echo "Logstash user created"` (ligne 158), avant le message final :

```sh
echo "Setting kibana_system password..."

curl -fsS \
  -u "${ELASTIC_USERNAME}:${ELASTIC_PASSWORD}" \
  -X POST \
  "${ELASTICSEARCH_URL}/_security/user/kibana_system/_password" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "'"${KIBANA_PASSWORD}"'"
  }'

echo
echo "kibana_system password set"
```

et dans `docker-compose.yml`, service `elasticsearch-init`, ajouter la variable au bloc `environment` :

```yaml
      KIBANA_PASSWORD: ${KIBANA_PASSWORD}
```

**Vérification faite** : le même appel API, lancé à la main dans le conteneur Elasticsearch, a répondu `{}` à 14:54:16 ; Kibana a démarré son vrai serveur à 14:54:26 et logué `Kibana is now available` à 14:54:28, sans autre intervention.

## Bug 2 — `init-kibana.sh` échoue en silence et affiche « created »

**Symptôme observé, cas 1 (premier démarrage)** : `kibana-init` termine en 24 s avec le code 0 pendant que Kibana n'est pas prêt :

```
Waiting for Kibana...
Kibana is ready
Creating data view...
{"statusCode":400,"error":"Bad Request","message":"uri [/api/data_views/data_view] with method [post] exists but is not available with the current configuration"}
Data view created
Creating dashboard...
{"statusCode":400,"error":"Bad Request","message":"uri [/api/dashboards/transcendence-logs-dashboard] with method [put] exists but is not available with the current configuration"}
Dashboard created
```

**Cas 2 (relancé une fois Kibana disponible, script inchangé)** : code 0 également :

```
Creating data view...
{"statusCode":401,"error":"Unauthorized","message":"Unauthorized"}
Data view created
Creating dashboard...
{"statusCode":401,"error":"Unauthorized","message":"Unauthorized"}
Dashboard created
```

**Cause** — `Main/requirements/kibana/init-kibana.sh`, trois défauts cumulés :
1. Ligne 10, `until curl -s ".../api/status"` : sans `-f`, curl sort en 0 dès que Kibana répond quoi que ce soit, y compris le 503 du mode preboot. La boucle d'attente n'attend donc rien.
2. Lignes 18 et 38 : aucune authentification, alors que la sécurité est activée (`xpack.security.enabled=true`) → 401.
3. Lignes 18 et 38 : sans `-f`, une réponse 4xx/5xx laisse curl sortir en 0 ; `set -e` ne se déclenche pas et le script affiche « created ».

De plus, le service `kibana-init` du compose ne reçoit aucun identifiant.

**Correctif proposé** (exactement celui qui a été testé) :

```diff
-until curl -s "${KIBANA_URL}/api/status" > /dev/null; do
+until curl -fs -u "elastic:${ELASTIC_PASSWORD}" "${KIBANA_URL}/api/status" > /dev/null; do
...
-curl -s -X POST "${KIBANA_URL}/api/data_views/data_view" \
+curl -fsS -u "elastic:${ELASTIC_PASSWORD}" -X POST "${KIBANA_URL}/api/data_views/data_view" \
...
-curl -s -X PUT "${KIBANA_URL}/api/dashboards/${DASHBOARD_ID}" \
+curl -fsS -u "elastic:${ELASTIC_PASSWORD}" -X PUT "${KIBANA_URL}/api/dashboards/${DASHBOARD_ID}" \
```

et dans `docker-compose.yml`, service `kibana-init` :

```yaml
    environment:
      ELASTIC_PASSWORD: ${ELASTIC_PASSWORD}
```

Pour la boucle d'attente, c'est le `-f` qui compte : une fois Kibana disponible, `/api/status` répond 200 même sans identifiants (constaté) ; le `-u` est là par cohérence.

**Vérification faite** (script corrigé lancé dans un conteneur `curlimages/curl` sur le réseau `transcendence`, avec `ELASTIC_PASSWORD`, comme le ferait le service) :
- data view `transcendence-logs` et dashboard `transcendence-logs-dashboard` créés : le JSON du dashboard et l'endpoint `PUT /api/dashboards/{id}` de Kibana 9.5.5 sont valides, le PUT crée l'objet s'il n'existe pas ;
- deuxième exécution : code 0, le script est rejouable ;
- `GET /kibana/api/data_views/data_view/transcendence-logs` et `GET /kibana/api/dashboards/transcendence-logs-dashboard` → 200 ;
- avec un mauvais mot de passe, curl sort en 22 et le script s'arrête : les échecs sont enfin visibles.

## Point bloquant de configuration — webhook Discord obligatoire

Avec `GRAFANA_DISCORD_WEBHOOK` vide, Grafana crashe en boucle (6 redémarrages, code 1) :

```
failure to map file contact-points.yml: failure parsing contact points: Discord Alerts: could not find webhook url property in settings
```

Ce n'est pas un bug du provisioning, mais la variable doit être documentée comme obligatoire (c'est fait dans `Main/.env.example`). N'importe quelle URL suffit pour démarrer sans Discord, par exemple `http://localhost/webhook-discord-a-remplacer`.

## Ce qui a été adapté à l'intégration (à ne pas écraser)

La branche `mlavry` est un commit orphelin basé sur une ancienne version du projet : ses `nginx.conf`, `main.ts`, `package.json`, `Makefile`, etc. sont antérieurs à dev. **Ne pas les réappliquer** : ils retireraient helmet, la restriction CORS, sharp, le script de test du backend, le resolver, le rate limiting, les headers de sécurité et les contrôles d'Origin WebSocket de nginx.

| Fichier (dev) | Ce qui a été fait |
|---|---|
| `Main/requirements/{grafana,kibana,logstash,prometheus,elasticsearch}/` | importés tels quels (11 fichiers identiques à l'octet), sans les `.DS_Store` ni `transcendence-dashboard.json.bak` |
| `backend/app/src/logger/`, `backend/app/src/metrics/` | importés tels quels |
| `backend/app/package.json` + lock | seulement `prom-client ^15.1.3` (+ `tdigest`, `bintrees`, `@opentelemetry/api` dans le lock) |
| `backend/app/src/main.ts` | `LogstashLogger` passé à `NestFactory.create` et log de démarrage ; helmet et CORS conservés |
| `backend/app/src/app.module.ts` | `MetricsController` + `APP_INTERCEPTOR` → `MetricsInterceptor` |
| `docker-compose.yml` | tes 10 services et 3 volumes, aux mêmes positions. Seule différence : `GF_SERVER_ROOT_URL` et `SERVER_PUBLICBASEURL` construits sur `https://${DOMAIN_NAME}:${NGINX_PORT}` (`https://localhost/grafana/` perdait le port 8443, ce qui casse les liens des alertes) |
| `nginx/conf/nginx.conf` | seulement tes blocs `/grafana/` et `/kibana/`, adaptés (ci-dessous) |
| `.env.example` | les 9 nouvelles variables documentées |

Adaptations nginx :
1. `proxy_pass $upstream_grafana;` / `$upstream_kibana;` via le `resolver` de dev. Avec `proxy_pass http://grafana:3000;` en dur, nginx refuse de démarrer si le conteneur n'est pas encore résolvable (il ne dépend que de frontend, backend et game), et garde une IP périmée après une recréation.
2. `return 301 https://$http_host/grafana/;` : un `return 301 /grafana/;` relatif est rendu absolu par nginx avec son port interne 443, soit `https://localhost/grafana/` sans le 8443.
3. Les deux locations ont leurs propres `add_header` (HSTS + nosniff), ce qui coupe l'héritage de la CSP et du `X-Frame-Options DENY` du frontend : Grafana a besoin de `'unsafe-eval'`, Kibana de `worker-src blob:` (sa propre CSP le déclare). Kibana 9.5.5 n'envoyant aucune protection anti-iframe (ni `X-Frame-Options`, ni `frame-ancestors`), la location `/kibana/` ajoute `X-Frame-Options SAMEORIGIN` ; Grafana envoie déjà `deny`.
4. `location ~* ^/api/metrics/?$ { return 404; }` : les métriques étaient publiques via `location /api/`. La regex est nécessaire parce qu'Express ignore la casse et le slash final : avec un simple `location = /api/metrics`, `/api/Metrics` et `/api/metrics/` renvoyaient encore les métriques (constaté). Prometheus lit `backend:3000` en direct et n'est pas concerné.

## Autres remarques (non bloquantes)

1. **Clé privée poussée** : `ollama_data/id_ed25519` (et `.pub`) est committée sur `origin/mlavry`, avec `ollama_data/cache/`, des `dist/` et des `.DS_Store`. La retirer de la branche ne l'efface pas du remote tant que le commit existe : régénérer la clé.
2. **Requêtes refusées par un guard invisibles** : un 401 de `JwtAuthGuard` (par exemple `GET /api/auth/me` sans token) n'est ni compté dans `http_requests_total`, ni envoyé à Logstash, parce que les guards Nest passent avant les interceptors (constaté). Pour voir les tokens expirés ou le brute force, compter dans un middleware sur `res.on('finish')`.
3. **Dashboard Kibana** : filtre global `status` entre 200 et 201, donc le camembert « Répartition des statuts HTTP » ne montre que des 200 ; titre automatique « Tableau de bord [2026-11-02T00:47:45.977+01:00] ».
4. **Champs Logstash** : l'input `http` ajoute `http.method: POST`, `url.*` et `user_agent` (ceux de la requête backend → Logstash) à côté de `method`/`route` de l'application, ce qui prête à confusion dans Kibana. `@timestamp` est l'heure de réception par Logstash, l'heure de l'application est dans `timestamp`. Piste : `date { match => ["timestamp", "ISO8601"] }` et `mutate { remove_field => ["http", "url", "user_agent"] }`.
5. **Secrets dans `.env`** : dev range les secrets dans `secrets/` (montés sur `/run/secrets`). Avec `env_file: .env`, les mots de passe ELK et Grafana arrivent aussi dans backend, game, frontend, nginx et postgres. Grafana accepte `GF_SECURITY_ADMIN_PASSWORD__FILE`, Elasticsearch `ELASTIC_PASSWORD_FILE`.
6. **Images `:latest`** (Grafana, Prometheus, postgres-exporter, curl, busybox) : épingler au moins Grafana, puisque les dashboards sont au format v2 exporté de la 13.3.0 (c'est ce que `latest` donne aujourd'hui). Prometheus n'a pas de volume (historique perdu à chaque recréation). `stdout { codec => rubydebug }` duplique chaque log dans la sortie de `make up`.
7. **Ressources** mesurées : Elasticsearch 1,18 Gio, Logstash 1,18 Gio, Kibana 1,02 Gio, Grafana 263 Mio, Prometheus 43 Mio de RAM ; environ 9 Go d'images.
8. **Course au démarrage bénigne** : Logstash reçoit des 401 pendant une dizaine de secondes, le temps qu'`elasticsearch-init` crée `logstash_internal`, puis logue `Restored connection to ES instance`.

## Reproduire et vérifier

Reproduire les bugs 1 et 2 sur un volume Elasticsearch neuf, sans toucher à la base Postgres :

```sh
cd Main
docker compose -p ft_transcendence rm -sf elasticsearch elasticsearch-init kibana kibana-init
docker volume rm ft_transcendence_elasticsearch_data
docker compose -p ft_transcendence up -d elasticsearch-init kibana kibana-init
docker logs kibana 2>&1 | grep kibana_system   # bug 1
docker logs kibana-init                        # bug 2
```

Après correctifs, sur un volume neuf : `kibana-init` termine en code 0 sans aucun `statusCode` dans ses logs, et `https://localhost:8443/kibana/` affiche le dashboard « Tableau de bord » avec des données après quelques appels à l'API.
