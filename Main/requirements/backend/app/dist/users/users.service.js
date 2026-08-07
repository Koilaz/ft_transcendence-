"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
        this.publicUserSelect = {
            id: true,
            username: true,
            avatarUrl: true,
            isOnline: true,
            lastSeenAt: true,
            createdAt: true,
        };
        this.privateUserSelect = {
            id: true,
            username: true,
            email: true,
            avatarUrl: true,
            isOnline: true,
            lastSeenAt: true,
            createdAt: true,
            updatedAt: true,
        };
    }
    // Liste publique des utilisateurs.
    // On ne renvoie ni les emails ni les mots de passe.
    findAll() {
        return this.prisma.user.findMany({
            select: this.publicUserSelect,
            orderBy: {
                username: 'asc',
            },
        });
    }
    // Profil complet de l'utilisateur connecté.
    findPublicById(id) {
        return this.prisma.user.findUnique({
            where: { id },
            select: this.privateUserSelect,
        });
    }
    // Utilisé pendant l'inscription.
    findByUsername(username) {
        return this.prisma.user.findUnique({
            where: { username },
        });
    }
    // Utilisé pendant la connexion.
    findByEmail(email) {
        return this.prisma.user.findUnique({
            where: { email },
        });
    }
    // Création d'un utilisateur.
    // On ne renvoie jamais passwordHash.
    create(data) {
        return this.prisma.user.create({
            data,
            select: this.privateUserSelect,
        });
    }
    // Modification du username de l'utilisateur connecté.
    updateUsername(id, username) {
        return this.prisma.user.update({
            where: { id },
            data: { username },
            select: this.privateUserSelect,
        });
    }
    updateAvatar(id, avatarUrl) {
        return this.prisma.user.update({
            where: { id },
            data: { avatarUrl },
            select: this.privateUserSelect,
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
