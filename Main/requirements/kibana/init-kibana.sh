#!/bin/sh

set -e

KIBANA_URL="http://kibana:5601/kibana"
DATA_VIEW_ID="transcendence-logs"

echo "Waiting for Kibana..."

until curl -s "${KIBANA_URL}/api/status" > /dev/null; do
  sleep 5
done

echo "Kibana is ready"

echo "Creating data view..."

curl -s -X POST "${KIBANA_URL}/api/data_views/data_view" \
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

curl -s -X PUT "${KIBANA_URL}/api/dashboards/${DASHBOARD_ID}" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  --data-binary "@/kibana/saved_objects/transcendence-dashboard.json"

echo
echo "Dashboard created"
