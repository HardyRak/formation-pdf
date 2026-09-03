import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type AccessGrantDocument = HydratedDocument<AccessGrant>;

/**
 * Droits d'accès d'un utilisateur sur une formation.
 * `_id` = `${userId}:${formationId}` (unicité naturelle).
 * `levelIds` vide = accès à tous les niveaux de la formation.
 * Les managers (role === 'MANAGER') n'ont pas besoin de grants : accès total.
 */
@Schema({ collection: 'access_grants', versionKey: false })
export class AccessGrant {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, index: true })
  formationId!: string;

  @Prop({ type: [String], default: [] })
  levelIds!: string[];

  /**
   * Droits fins au niveau du document. Vide = accès à tous les documents du
   * ou des niveaux autorisés. Un document « octroyé » ouvre aussi son niveau
   * et sa formation (cascade) : quand `documentIds` est renseigné, le/les
   * niveaux correspondants sont ajoutés à `levelIds`.
   */
  @Prop({ type: [String], default: [] })
  documentIds!: string[];

  /**
   * Date du dernier octroi (création ou fusion d'un nouvel accès en cascade).
   * Optionnel pour rester compatible avec les grants créés avant ce champ.
   */
  @Prop({ type: Date })
  grantedAt?: Date;
}

export const AccessGrantSchema = SchemaFactory.createForClass(AccessGrant);
