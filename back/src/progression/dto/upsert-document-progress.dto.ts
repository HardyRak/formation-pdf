import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Charge utile d'un upsert de progression (PUT /progression/documents/:documentId).
 * Le `documentId` provient de la route ; le `userId` du JWT. Le serveur
 * recalcule `percent` / `completed` et fusionne `pagesRead`.
 */
export class UpsertDocumentProgressDto {
  @IsString()
  @MaxLength(64)
  levelId!: string;

  @IsString()
  @MaxLength(64)
  formationId!: string;

  @IsInt()
  @Min(1)
  lastPage!: number;

  @IsInt()
  @Min(1)
  pageCount!: number;

  /** Pages consultées (1-based) — dédupliquées et bornées par le serveur. */
  @IsArray()
  @ArrayMaxSize(5000)
  @IsInt({ each: true })
  @Min(1, { each: true })
  pagesRead!: number[];

  /** Present pour compatibilité, mais recalculé côté serveur. */
  @IsInt()
  @Min(0)
  @Max(100)
  percent!: number;

  @IsBoolean()
  completed!: boolean;

  /** Horodatage client (ms) de l'activité — arbitre du « last write wins ». */
  @IsInt()
  @Min(0)
  updatedAt!: number;
}
