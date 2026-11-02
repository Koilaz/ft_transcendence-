#!/bin/sh

set -e

ELASTICSEARCH_URL="http://elasticsearch:9200"

echo "Waiting for Elasticsearch..."

until curl -fsS \
  -u "${ELASTIC_USERNAME}:${ELASTIC_PASSWORD}" \
  "${ELASTICSEARCH_URL}" > /dev/null; do
  sleep 5
done

echo "Elasticsearch is ready"

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
    "password": "'"${LOGSTASH_PASSWORD}"'",
    "roles": [
      "logstash_writer"
    ],
    "full_name": "Logstash Internal User"
  }'

echo
echo "Logstash user created"

echo
echo "Elasticsearch initialization completed successfully"
