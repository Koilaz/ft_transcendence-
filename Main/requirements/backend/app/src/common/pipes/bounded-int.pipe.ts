import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

// Les identifiants arrivant par l'URL finissent dans des colonnes Prisma
// Int, c'est-a-dire des int4 PostgreSQL : un entier signe sur 32 bits.
//
// Le ParseIntPipe standard ne borne rien : "2147483648" passe le pipe puis
// fait echouer la requete SQL (P2020), remontee en 500 non gere. On borne
// ici a l'intervalle int4 pour repondre 400.
//
// Le ValidationPipe global (transform: true) convertit deja les parametres
// routes en number d'apres leur type TypeScript avant ce pipe : on recoit
// donc un number quand il est actif, une string sinon (tests, autre app).
const INT4_MIN = -2147483648;
const INT4_MAX = 2147483647;

@Injectable()
export class BoundedIntPipe implements PipeTransform<string | number, number> {
  transform(value: string | number, _metadata: ArgumentMetadata): number {
    let parsed: number;

    if (typeof value === 'number') {
      parsed = value;
    } else if (typeof value === 'string' && /^-?\d+$/.test(value)) {
      parsed = Number(value);
    } else {
      throw new BadRequestException(
        'Validation failed (integer is expected)',
      );
    }

    if (!Number.isInteger(parsed)) {
      throw new BadRequestException(
        'Validation failed (integer is expected)',
      );
    }

    if (parsed < INT4_MIN || parsed > INT4_MAX) {
      throw new BadRequestException(
        'Validation failed (integer out of range)',
      );
    }

    return parsed;
  }
}
