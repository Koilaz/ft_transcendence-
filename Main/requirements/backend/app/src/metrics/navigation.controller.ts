import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { Counter } from 'prom-client';
import { LogstashLogger } from '../logger/logstash.logger';

const routes = ['/', '/login', '/register', '/profile', '/friends', '/game',
  '/privacy-policy', '/terms-of-service', 'not-found'];

class PageViewDto {
  @IsIn(routes)
  route!: string;
}

const pageViews = new Counter({
  name: 'page_views_total',
  help: 'Browser page views, including client-side React navigation',
  labelNames: ['route'],
});

@Controller('telemetry')
export class NavigationController {
  constructor(private readonly logger: LogstashLogger) {}

  @Post('pageview')
  @HttpCode(204)
  pageView(@Body() body: PageViewDto): void {
    pageViews.inc({ route: body.route });
    this.logger.pageView(body.route);
  }
}
