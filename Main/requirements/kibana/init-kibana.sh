#!/bin/sh

set -eu

ELASTIC_USERNAME=${ELASTIC_USERNAME:-elastic}
: "${ELASTIC_PASSWORD:?ELASTIC_PASSWORD is required}"
KIBANA_URL=${KIBANA_URL:-http://kibana:5601/kibana}
KIBANA_CONFIG_DIR=${KIBANA_CONFIG_DIR:-/kibana}
INIT_MAX_ATTEMPTS=${INIT_MAX_ATTEMPTS:-60}
INIT_RETRY_SECONDS=${INIT_RETRY_SECONDS:-5}
DATA_VIEW_ID="transcendence-logs"

# Provisioning requires an admin account; kibana_system is a server account.
# Fail on HTTP errors instead of printing a false success message.
curl() {
  command curl -fsS --connect-timeout 5 --max-time 30 \
    -u "${ELASTIC_USERNAME}:${ELASTIC_PASSWORD}" "$@"
}

echo "Waiting for Kibana..."

attempt=1
until curl "${KIBANA_URL}/api/status" > /dev/null 2>&1; do
  if [ "$attempt" -ge "$INIT_MAX_ATTEMPTS" ]; then
    echo "Kibana did not become ready. Check Kibana logs and Elasticsearch initialization." >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep "$INIT_RETRY_SECONDS"
done

echo "Kibana is ready"

echo "Creating data view..."

curl -X POST "${KIBANA_URL}/api/data_views/data_view" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -d '{
    "data_view": {
      "id": "'"${DATA_VIEW_ID}"'",
      "name": "Transcendence Logs",
      "title": "transcendence-logs-*",
      "timeFieldName": "@timestamp"
    },
    "override": true
  }'

echo
echo "Data view created"

echo "Creating dashboard..."

DASHBOARD_ID="transcendence-logs-dashboard"

curl -X PUT "${KIBANA_URL}/api/dashboards/${DASHBOARD_ID}" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  --data-binary "@${KIBANA_CONFIG_DIR}/saved_objects/transcendence-dashboard.json"

echo
echo "Dashboard created"
