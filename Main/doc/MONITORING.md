# Application and game monitoring

Open the existing Grafana dashboard **Application & Game Monitoring** (same UID
as the former Backend Monitoring dashboard), or Kibana's **Application and Game
Activity** dashboard. Reload an already open tab after provisioning changes.
Both dashboards default to the last 30 minutes and refresh every 15 seconds.
An explicitly selected browser time range or refresh setting can override these
defaults; keep the end time at **now** and refresh enabled.

## What is collected

| Source | Prometheus endpoint | Logs sent to Logstash |
| --- | --- | --- |
| Nest backend | `backend:3000/api/metrics` | Completed HTTP responses, including guard rejections and unmatched routes |
| Game service | `game:3000/metrics` | HTTP responses and WebSocket connection/message/disconnection events |
| PostgreSQL exporter | `postgres_exporter:9187/metrics` | Exporter diagnostics remain in its Docker logs |

Prometheus scrapes all three targets every 15 seconds. Allow roughly 15–30
seconds for a new metric to appear after the dashboard refreshes. Elasticsearch
indexing and the Kibana refresh also introduce a short delay.

The game uses persistent WebSockets. A chat message, vote or server state update
does **not** generate a new HTTP 200 response. Use the game's WebSocket panels:

- Active connections: `game_websocket_connections`.
- Accepted connections since process start: `game_websocket_connections_total`.
- Sent/received messages: `game_websocket_messages_total{direction="sent"}` and
  `{direction="received"}`.

In Kibana Discover, select `transcendence-logs-*` and use:

```text
service: "backend" and message: "HTTP request"
service: "game" and message: "WebSocket activity"
```

Game log `event_type` values distinguish connected, disconnected, message_sent,
and message_received. The name `event` is reserved by Logstash's ECS codec for
an object containing `event.original`; a string in that field fails decoding.
Chat text, JWTs, resume tokens and player names are not included in telemetry.
HTTP metric/log routes use route templates; unknown routes use `unmatched`.
Metrics scrapes are excluded from HTTP activity counts.

HTTP counters restart at zero when the application process restarts. A 201 is
usually a successful registration; a 409 on `/api/auth/register` means a
registration conflict. These are application responses, not build errors.
Grafana's HTTP panels are scoped to the backend job, and its game panels show
WebSocket activity separately. Kibana's HTTP panels retain their HTTP filter,
with a separate card for game WebSocket events.

Frontend files served by Vite/nginx, browser-only navigation, and backend
presence WebSocket frames are outside these application metrics. Docker console
output is not automatically ingested; the structured HTTP/game telemetry is sent
explicitly. Log delivery is best-effort with a three-second timeout, not a durable
queue, so Logstash outages can lose log events while Prometheus counters continue.

## Apply future changes

From `Main/`:

```sh
docker compose up -d --build --no-deps backend game
docker kill --signal=HUP prometheus
docker compose run --rm --no-deps kibana-init
```

Grafana file provisioning picks up dashboard JSON changes automatically. Game
restarts disconnect players, so apply those changes between games.

## Checks

The backend HTTP telemetry test covers real Nest responses for success,
authentication rejection, 404, route normalization and metrics exclusion. The
game telemetry test uses real local HTTP/WebSocket connections to check counters,
initial outbound messages, disconnect cleanup, and exclusion of secret content.
Both run with their application's existing `npm test` command and require no
database, AI service or external logging server.
