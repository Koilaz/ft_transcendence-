"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresenceModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_module_1 = require("../prisma/prisma.module");
const presence_gateway_1 = require("./presence.gateway");
const presence_service_1 = require("./presence.service");
let PresenceModule = class PresenceModule {
};
exports.PresenceModule = PresenceModule;
exports.PresenceModule = PresenceModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            jwt_1.JwtModule.registerAsync({
                useFactory: () => {
                    const secret = process.env.JWT_SECRET;
                    if (!secret) {
                        throw new Error('JWT_SECRET is missing');
                    }
                    return {
                        secret,
                    };
                },
            }),
        ],
        providers: [
            presence_gateway_1.PresenceGateway,
            presence_service_1.PresenceService,
        ],
        exports: [
            presence_gateway_1.PresenceGateway,
            presence_service_1.PresenceService,
        ],
    })
], PresenceModule);
