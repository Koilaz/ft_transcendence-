import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import { Counter, Histogram } from 'prom-client';

import { Observable } from 'rxjs';

import { finalize, tap } from 'rxjs/operators';

import { LogstashLogger } from '../logger/logstash.logger';

//On crée un nouvel objet Counter et on lui donne un 
// objet de configuration JavaScript (qui s'écrit avec des accolades)
const httpRequestsTotal = new Counter(
	{
		name: 'http_requests_total',
    	help: 'Total number of HTTP requests',
    	labelNames: ['method', 'route', 'status'],
  	}
);

const httpRequestDurationSeconds = new Histogram(
	{
		name: 'http_request_duration_seconds',
  		help: 'Duration of HTTP requests in seconds',
  		labelNames: ['method', 'route', 'status'],
	}
);

const logstashLogger = new LogstashLogger();

//implements NestInterceptor indique que la classe 
// respecte le format attendu pour un interceptor NestJS
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest();
    	const response = context.switchToHttp().getResponse();

		if (request.url === '/api/metrics')
			return next.handle();

    	const start = process.hrtime.bigint();

		let status: string;

    	return next.handle().pipe(
			
			tap({
				next: () => {
    				status = response.statusCode.toString();
  				},

  				error: (error) => {
    				if (typeof error.getStatus === 'function')
      					status = error.getStatus().toString();
    				else
      					status = '500';
  				},
			}),

      		finalize(() => {
        		const end = process.hrtime.bigint();
        		const duration = Number(end - start) / 1e9;

        		const method = request.method;
				//essaie d’utiliser le chemin de route NestJS ; sinon utilise l’URL brute.
        		const route = request.route?.path ?? request.url;

        		httpRequestsTotal.inc(
					{ method, route, status }
				);

        		httpRequestDurationSeconds.observe(
          			{ method, route, status },
          			duration,
        		);
				
				logstashLogger.http(
					method,
					request.originalUrl ?? request.url,
					Number(status),
					duration * 1000,
				);
      		}),
    	);
	}
}
