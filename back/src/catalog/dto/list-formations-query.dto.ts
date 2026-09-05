import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Query de la liste paginée des formations (app mobile / infinite scroll).
 *
 * La recherche (`q`) et le filtre catégorie sont traités côté serveur : le
 * client ne charge jamais l'intégralité du catalogue pour filtrer localement.
 */
export class ListFormationsQueryDto {
  /** Terme de recherche (nom, description ou catégorie). */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80)
  q?: string;

  /** Nom exact de la catégorie à filtrer. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(80)
  category?: string;

  /** Page demandée (1-based). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  /** Taille de page. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
