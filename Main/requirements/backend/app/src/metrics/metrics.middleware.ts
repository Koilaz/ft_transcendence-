import type { NextFunction, Request, Response } from 'express';
import { Counter, Histogram } from 'prom-client';
import { LogstashLogger } from '../logger/logstash.logger';

const requests = new Counter({
  name: 'http_requests_total',
  help: 'Completed backend HTTP requests',
  labelNames: ['method', 'route', 'status'],
});
const duration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Backend HTTP response duration in seconds',
  labelNames: ['method', 'route', 'status'],
});

// Registered before Nest routing/guards. The finish event sees the actual
// response code, including guard failures and unmatched routes.
export function httpTelemetry(logger: Pick<LogstashLogger, 'http'>) {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (request.path === '/api/metrics') {
      next();
      return;
    }
    const start = process.hrtime.bigint();
    response.once('finish', () => {
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      // Route templates keep labels bounded and omit IDs, JWTs and query data.
      const route = typeof request.route?.path === 'string'
        ? request.route.path : 'unmatched';
      const labels = { method: request.method, route, status: String(response.statusCode) };
      requests.inc(labels);
      duration.observe(labels, seconds);
      logger.http(request.method, route, response.statusCode, seconds * 1000);
    });
    next();
  };
}
