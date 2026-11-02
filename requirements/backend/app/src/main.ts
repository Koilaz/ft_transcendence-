import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { PresenceGateway } from './presence/presence.gateway';
import { LogstashLogger } from './logger/logstash.logger';

async function bootstrap(): Promise<void> {
  const logger = new LogstashLogger();

  const app = await NestFactory.create(AppModule, {
    logger,
  });

  app.enableShutdownHooks();

  app.setGlobalPrefix('api');

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const presenceGateway = app.get(PresenceGateway);

  await presenceGateway.attach(app.getHttpServer());

  await app.listen(3000, '0.0.0.0');

  logger.log('Backend running on port 3000', 'Bootstrap');
}

bootstrap();
