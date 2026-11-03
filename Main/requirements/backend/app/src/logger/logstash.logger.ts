import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class LogstashLogger implements LoggerService {
  private readonly logstashUrl = process.env.LOGSTASH_URL ?? 'http://logstash:5000';

  private send(
    level: string,
    message: any,
    context?: string,
    trace?: string,
    metadata: Record<string, any> = {},
  ): void {
    const log = {
      level,
      message:
        typeof message === 'string'
          ? message
          : JSON.stringify(message),
      context: context ?? 'Application',
      service: 'backend',
      timestamp: new Date().toISOString(),
      ...metadata,
      ...(trace ? { trace } : {}),
    };

    console.log(JSON.stringify(log));

    fetch(this.logstashUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(log),
      signal: AbortSignal.timeout(3000),
    }).then(async (response) => {
      await response.body?.cancel();
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    }).catch((error) => {
      console.error(
        `Impossible d'envoyer le log à Logstash: ${error.message}`,
      );
    });
  }

  log(message: any, context?: string): void {
    this.send('info', message, context);
  }

  pageView(route: string): void {
    this.send('info', 'Page view', 'Navigation', undefined, { route });
  }

  error(message: any, trace?: string, context?: string): void {
    this.send('error', message, context, trace);
  }

  warn(message: any, context?: string): void {
    this.send('warn', message, context);
  }

  debug(message: any, context?: string): void {
    this.send('debug', message, context);
  }

  verbose(message: any, context?: string): void {
    this.send('verbose', message, context);
  }

  http(
    method: string,
    route: string,
    status: number,
    durationMs: number,
  ): void {
    const level = status >= 500
      ? 'error'
      : status >= 400
        ? 'warn'
        : 'info';

    this.send(
      level,
      'HTTP request',
      'HTTP',
      undefined,
      {
        method,
        route,
        status,
        duration_ms: durationMs,
      },
    );
  }
}
