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

  // Liste publique des utilisateurs.
  // On ne renvoie ni les emails ni les mots de passe.
  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }

  // Profil complet de l'utilisateur connecté.
  findPublicById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
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

  // Création d'un utilisateur.
  // On ne renvoie jamais passwordHash.
  create(data: CreateUserData) {
    return this.prisma.user.create({
      data,
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // Modification du username de l'utilisateur connecté.
  updateUsername(id: number, username: string) {
    return this.prisma.user.update({
      where: { id },
      data: { username },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  updateAvatar(id: number, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id },
      data: { avatarUrl },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}