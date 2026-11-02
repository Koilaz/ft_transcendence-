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
exports.RegisterDto = void 0;
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
class RegisterDto {
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string' ? value.trim() : value),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(3),
    (0, class_validator_1.MaxLength)(20),
    (0, class_validator_1.Matches)(/^[a-zA-Z0-9_]+$/, {
        message: 'Username can only contain letters, numbers and underscores',
    }),
    __metadata("design:type", String)
], RegisterDto.prototype, "username", void 0);
__decorate([
    (0, class_transformer_1.Transform)(({ value }) => typeof value === 'string'
        ? value.trim().toLowerCase()
        : value),
    (0, class_validator_1.IsEmail)(),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8),
    (0, class_validator_1.MaxLength)(100),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
// @IsString() = le champ doit être une chaîne de caractères.
// @MinLength(3) = au moins 3 caractères.
// @MaxLength(20) = au maximum 20 caractères.
// @IsEmail() = vérifie automatiquement qu'il s'agit d'un email valide le parsing est fait pour nous
// La validation est effectuée automatiquement par ValidationPipe.
// Le ! signifie :
// "Je garantis que cette propriété sera initialisée."
// Dans notre cas, c'est vrai : NestJS va construire cet objet à partir du JSON reçu dans la requête
// apres l'activation de ValidationPipe, si quelqu'un envoie :
// {
//     "username": "",
//     "email": "bonjour",
//     "password": "123"
// }
// NestJS répondra directement : 400 Bad Request
// avec un message venant de nest js plutot precis du genre :
//     "username must be longer than or equal to 3 characters",
//     "email must be an email",
//     "password must be longer than or equal to 8 characters"
