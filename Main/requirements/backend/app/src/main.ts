import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { PresenceGateway } from './presence/presence.gateway';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  // Headers de securite sur toutes les reponses du backend (CSP par
  // defaut, nosniff, X-Frame-Options, etc.). Le HTML du frontend est
  // servi par nginx, pas ici : la CSP utile au jeu vit cote nginx.
  app.use(helmet());

  app.setGlobalPrefix('api');

  // Tout le trafic navigateur passe par nginx : le site a une seule
  // origine, https://<DOMAIN_NAME>:<NGINX_PORT>. On refuse les appels
  // cross-origin venant d'autres sites.
  const domainName = process.env.DOMAIN_NAME ?? 'localhost';
  const nginxPort = process.env.NGINX_PORT ?? '8443';

  app.enableCors({
    origin: `https://${domainName}:${nginxPort}`,
  });

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

  console.log('Backend running on port 3000');
}

bootstrap();