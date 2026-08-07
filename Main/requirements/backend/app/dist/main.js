"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const presence_gateway_1 = require("./presence/presence.gateway");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableShutdownHooks();
    app.setGlobalPrefix('api');
    app.enableCors();
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const presenceGateway = app.get(presence_gateway_1.PresenceGateway);
    await presenceGateway.attach(app.getHttpServer());
    await app.listen(3000, '0.0.0.0');
    console.log('Backend running on port 3000');
}
bootstrap();
