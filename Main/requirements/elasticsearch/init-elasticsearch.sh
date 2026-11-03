#!/bin/sh

set -eu

ELASTIC_USERNAME=${ELASTIC_USERNAME:-elastic}
: "${ELASTIC_PASSWORD:?ELASTIC_PASSWORD is required}"
: "${KIBANA_PASSWORD:?KIBANA_PASSWORD is required}"
: "${LOGSTASH_PASSWORD:?LOGSTASH_PASSWORD is required}"
ELASTICSEARCH_URL=${ELASTICSEARCH_URL:-http://elasticsearch:9200}
INIT_MAX_ATTEMPTS=${INIT_MAX_ATTEMPTS:-60}
INIT_RETRY_SECONDS=${INIT_RETRY_SECONDS:-5}

# Encode credentials as JSON strings, including quotes and control characters.
json_string() {
  JSON_VALUE="$1" awk 'BEGIN {
    for (i = 1; i < 32; i++) escapes[sprintf("%c", i)] = sprintf("\\u%04x", i)
    value = ENVIRON["JSON_VALUE"]
    printf "\""
    for (i = 1; i <= length(value); i++) {
      c = substr(value, i, 1)
      if (c == "\\" || c == "\"") printf "\\%s", c
      else if (c in escapes) printf "%s", escapes[c]
      else printf "%s", c
    }
    printf "\""
  }'
}

curl() {
  command curl --connect-timeout 5 --max-time 30 "$@"
}

echo "Waiting for Elasticsearch..."

attempt=1
until curl -fsS \
  -u "${ELASTIC_USERNAME}:${ELASTIC_PASSWORD}" \
  "${ELASTICSEARCH_URL}" > /dev/null 2>&1; do
  if [ "$attempt" -ge "$INIT_MAX_ATTEMPTS" ]; then
    echo "Elasticsearch did not become ready. Check its logs and ELASTIC_PASSWORD (existing volumes retain the stored password)." >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep "$INIT_RETRY_SECONDS"
done

echo "Elasticsearch is ready"

echo "Setting kibana_system password..."
curl -fsS \
  -u "${ELASTIC_USERNAME}:${ELASTIC_PASSWORD}" \
  -X POST \
  "${ELASTICSEARCH_URL}/_security/user/kibana_system/_password" \
  -H "Content-Type: application/json" \
  -d "{\"password\":$(json_string "$KIBANA_PASSWORD")}" > /dev/null
echo "kibana_system password configured"

echo "Creating ILM retention policy..."

curl -fsS \
  -u "${ELASTIC_USERNAME}:${ELASTIC_PASSWORD}" \
  -X PUT \
  "${ELASTICSEARCH_URL}/_ilm/policy/transcendence-logs-retention" \
  -H "Content-Type: application/json" \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "actions": {}
        },
        "delete": {
          "min_age": "30d",
          "actions": {
            "delete": {}
          }
        }
      }
    }
  }'

echo
echo "ILM policy created"

echo "Creating index template..."

curl -fsS \
  -u "${ELASTIC_USERNAME}:${ELASTIC_PASSWORD}" \
  -X PUT \
  "${ELASTICSEARCH_URL}/_index_template/transcendence-logs-template" \
  -H "Content-Type: application/json" \
  -d '{
    "index_patterns": [
      "transcendence-logs-*"
    ],
    "template": {
      "settings": {
        "index.lifecycle.name": "transcendence-logs-retention",
        "number_of_replicas": 0
      }
    },
    "priority": 100
  }'

echo
echo "Index template created"

echo "Creating snapshot repository..."

curl -fsS \
  -u "${ELASTIC_USERNAME}:${ELASTIC_PASSWORD}" \
  -X PUT \
  "${ELASTICSEARCH_URL}/_snapshot/transcendence-logs-backup" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "fs",
    "settings": {
      "location": "/usr/share/elasticsearch/backups",
      "compress": true
    }
  }'

echo
echo "Snapshot repository created"

echo "Creating snapshot lifecycle policy..."

curl -fsS \
  -u "${ELASTIC_USERNAME}:${ELASTIC_PASSWORD}" \
  -X PUT \
  "${ELASTICSEARCH_URL}/_slm/policy/transcendence-logs-snapshots" \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "0 30 2 * * ?",
    "name": "<transcendence-logs-{now/d}>",
    "repository": "transcendence-logs-backup",
    "config": {
      "indices": [
        "transcendence-logs-*"
      ],
      "ignore_unavailable": true,
      "include_global_state": false
    },
    "retention": {
      "expire_after": "90d",
      "min_count": 7,
      "max_count": 100
    }
  }'

echo
echo "Snapshot lifecycle policy created"

echo "Creating Logstash role..."

curl -fsS \
  -u "${ELASTIC_USERNAME}:${ELASTIC_PASSWORD}" \
  -X PUT \
  "${ELASTICSEARCH_URL}/_security/role/logstash_writer" \
  -H "Content-Type: application/json" \
  -d '{
    "cluster": [
      "monitor",
      "manage_index_templates",
      "manage_ilm"
    ],
    "indices": [
      {
        "names": [
          "transcendence-logs-*"
        ],
        "privileges": [
          "create_index",
          "write",
          "create"
        ]
      }
    ]
  }'

echo
echo "Logstash role created"

echo "Creating Logstash user..."

curl -fsS \
  -u "${ELASTIC_USERNAME}:${ELASTIC_PASSWORD}" \
  -X POST \
  "${ELASTICSEARCH_URL}/_security/user/logstash_internal" \
  -H "Content-Type: application/json" \
  -d '{
    "password": '"$(json_string "$LOGSTASH_PASSWORD")"',
    "roles": [
      "logstash_writer"
    ],
    "full_name": "Logstash Internal User"
  }'

echo
echo "Logstash user created"

echo
echo "Elasticsearch initialization completed successfully"
