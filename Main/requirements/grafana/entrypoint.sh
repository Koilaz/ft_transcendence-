#!/bin/sh
set -eu

# Provision from a writable copy and provide all expected directories.
provisioning_dir=$(mktemp -d /tmp/grafana-provisioning.XXXXXX)
cp -R "${GF_PATHS_PROVISIONING:-/etc/grafana/provisioning}/." "$provisioning_dir/"
mkdir -p "$provisioning_dir/plugins" "$provisioning_dir/alerting" \
  "$provisioning_dir/dashboards" "$provisioning_dir/datasources"
find "$provisioning_dir" -name .DS_Store -delete
export GF_PATHS_PROVISIONING="$provisioning_dir"

# Discord notifications are optional.
if [ -z "${GRAFANA_DISCORD_WEBHOOK:-}" ]; then
  rm -rf "$provisioning_dir/alerting"
  mkdir -p "$provisioning_dir/alerting"
  echo "GRAFANA_DISCORD_WEBHOOK is unset; skipping Discord alert provisioning."
fi

exec /run.sh "$@"
