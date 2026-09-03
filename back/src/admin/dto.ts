import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query de listage des utilisateurs (admin) : recherche plein texte + filtre
 * rôle + pagination optionnelle (sans `page`/`limit`, toute la liste est
 * renvoyée — comportement historique attendu par les selects du back-office).
 */
export class ListUsersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;

  @IsOptional()
  @IsIn(['LEARNER', 'MANAGER'])
  role?: 'LEARNER' | 'MANAGER';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

/** Query de listage des formations (admin) : recherche `q` sur le nom. */
export class ListFormationsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;
}

/**
 * Query de l'avancement d'un apprenant : pagination optionnelle par fenêtre
 * (`offset`/`limit`) pour le défilement infini du back-office. Sans paramètres,
 * toutes les formations sont renvoyées.
 */
export class ListUserProgressQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

/** Création d'un compte utilisateur (admin). */
export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MaxLength(80)
  firstName!: string;

  @IsString()
  @MaxLength(80)
  lastName!: string;

  @IsIn(['LEARNER', 'MANAGER'])
  role!: 'LEARNER' | 'MANAGER';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  avatarColor?: string;
}

/** Mise à jour d'un compte (admin) — tous champs optionnels. */
export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsIn(['LEARNER', 'MANAGER'])
  role?: 'LEARNER' | 'MANAGER';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  avatarColor?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

/** Activation / désactivation d'un compte. */
export class SetActiveDto {
  @IsBoolean()
  active!: boolean;
}

/**
 * Donner l'accès à un document (cascade niveau + formation).
 * `levelIds` / `documentIds` vides = accès aux niveaux / documents de toute la
 * formation. `documentIds` renseigné ⇒ le niveau correspondant est ajouté.
 */
export class GrantAccessDto {
  @IsString()
  userId!: string;

  @IsString()
  formationId!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  levelIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  documentIds?: string[];
}

/** Création d'une formation (admin). */
export class CreateFormationDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(400)
  description!: string;

  @IsString()
  @MaxLength(80)
  category!: string;

  @IsString()
  @MaxLength(40)
  icon!: string;

  @IsString()
  @MaxLength(16)
  color!: string;

  @IsOptional()
  @IsBoolean()
  mandatory?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

/** Mise à jour d'une formation (admin). */
export class UpdateFormationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  color?: string;

  @IsOptional()
  @IsBoolean()
  mandatory?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

/** Création d'un niveau (admin). */
export class CreateLevelDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(400)
  description!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

/** Mise à jour d'un niveau (admin). */
export class UpdateLevelDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

/** Métadonnées d'un document lors de la création (le fichier arrive en multipart). */
export class CreateDocumentDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

/** Mise à jour des métadonnées d'un document (sans fichier). */
export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

/** Lot d'identifiants de documents (résolution de titres en 1 requête). */
export class DocumentTitlesDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  ids?: string[];
}

/** Création d'une catégorie de formation (admin). */
export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
}

/** Mise à jour / renommage d'une catégorie (admin). */
export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
