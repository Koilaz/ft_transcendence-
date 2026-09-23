import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

type CreateUserData = {
  username: string;
  email: string;
  passwordHash: string;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly publicUserSelect = {
    id: true,
    username: true,
    avatarUrl: true,
    isOnline: true,
    lastSeenAt: true,
    createdAt: true,
  } as const;

  private readonly privateUserSelect = {
    id: true,
    username: true,
    email: true,
    avatarUrl: true,
    isOnline: true,
    lastSeenAt: true,
    createdAt: true,
    updatedAt: true,
  } as const;

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
  findPublicById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: this.privateUserSelect,
    });
  }

  // Utilisé pendant l'inscription.
  findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  // Utilisé pendant la connexion.
  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findCredentialsById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, passwordHash: true },
    });
  }

  async updatePasswordHash(id: number, currentHash: string, passwordHash: string) {
    // Ne pas écraser un mot de passe changé entre la vérification et l'écriture.
    const result = await this.prisma.user.updateMany({
      where: { id, passwordHash: currentHash },
      data: { passwordHash },
    });
    return result.count === 1;
  }

  // Création d'un utilisateur.
  // On ne renvoie jamais passwordHash.
  create(data: CreateUserData) {
    return this.prisma.user.create({
      data,
      select: this.privateUserSelect,
    });
  }

  // Modification du username de l'utilisateur connecté.
  updateUsername(id: number, username: string) {
    return this.prisma.user.update({
      where: { id },
      data: { username },
      select: this.privateUserSelect,
    });
  }

  updateAvatar(id: number, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id },
      data: { avatarUrl },
      select: this.privateUserSelect,
    });
  }
}
