#!/bin/sh
set -eu

# Provision from a writable copy and provide all expected directories.
provisioning_dir=$(mktemp -d /tmp/grafana-provisioning.XXXXXX)
cp -R "${GF_PATHS_PROVISIONING:-/etc/grafana/provisioning}/." "$provisioning_dir/"
mkdir -p "$provisioning_dir/plugins" "$provisioning_dir/alerting" \
  "$provisioning_dir/dashboards" "$provisioning_dir/datasources"
find "$provisioning_dir" -name .DS_Store -delete
export GF_PATHS_PROVISIONING="$provisioning_dir"

# contact-points.yml reads the webhook from the environment.
GRAFANA_DISCORD_WEBHOOK=$(tr -d '\n' < /run/secrets/grafana_discord_webhook.txt)
export GRAFANA_DISCORD_WEBHOOK

# Discord notifications are optional: leave the secret file empty to disable them.
if [ -z "$GRAFANA_DISCORD_WEBHOOK" ]; then
  rm -rf "$provisioning_dir/alerting"
  mkdir -p "$provisioning_dir/alerting"
  echo "grafana_discord_webhook.txt is empty; skipping Discord alert provisioning."
fi

exec /run.sh "$@"
