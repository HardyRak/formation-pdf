import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type DocumentProgressDocument = HydratedDocument<DocumentProgress>;

/**
 * Progression de lecture d'un document pour un utilisateur.
 * `_id` = `${userId}:${documentId}` (unicité naturelle : une seule ligne
 * par couple utilisateur/document, comme `access_grants`).
 *
 * La progression vit DÉSORMAIS en base (source de vérité partagée entre
 * appareils) : le mobile reste la couche offline-first et pousse ses
 * modifications vers ces documents.
 */
@Schema({ collection: 'document_progress', versionKey: false })
export class DocumentProgress {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ type: String, required: true, index: true })
  userId!: string;

  @Prop({ type: String, required: true, index: true })
  documentId!: string;

  @Prop({ type: String, required: true, index: true })
  levelId!: string;

  @Prop({ type: String, required: true, index: true })
  formationId!: string;

  /** Dernière page consultée (1-based). */
  @Prop({ type: Number, required: true, min: 1 })
  lastPage!: number;

  /** Nombre total de pages du document (dénormalisé, pour recalculer le %). */
  @Prop({ type: Number, required: true, min: 1 })
  pageCount!: number;

  /** Pages réellement consultées, triées, dédupliquées (1-based). */
  @Prop({ type: [Number], default: [] })
  pagesRead!: number[];

  /** Pourcentage de pages lues (0–100), recalculé côté serveur. */
  @Prop({ type: Number, required: true, min: 0, max: 100 })
  percent!: number;

  @Prop({ type: Boolean, required: true, default: false })
  completed!: boolean;

  /** Horodatage de la dernière activité de lecture (ms, horloge client). */
  @Prop({ type: Number, required: true })
  updatedAt!: number;
}

export const DocumentProgressSchema = SchemaFactory.createForClass(DocumentProgress);
