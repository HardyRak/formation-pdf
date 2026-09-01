import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import type { PdfPageDto } from '../common/contracts';

export type TrainingDocumentDocument = HydratedDocument<TrainingDocumentModel>;

/**
 * Document de formation. `_id` = identifiant métier ('doc-hse-101', …).
 * Les pages sont embarquées (contenu confidentiel) : elles ne sont servies
 * QUE par la route authentifiée `/documents/:id/stream`, jamais en liste.
 */
@Schema({ collection: 'documents', versionKey: false })
export class TrainingDocumentModel {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true, index: true })
  levelId!: string;

  @Prop({ required: true, index: true })
  formationId!: string;

  @Prop({ required: true })
  order!: number;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ default: 0 })
  pageCount!: number;

  @Prop({ default: 0 })
  sizeKb!: number;

  @Prop({ required: true })
  updatedAt!: Date;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  pages!: PdfPageDto[];
}

export const TrainingDocumentSchema = SchemaFactory.createForClass(TrainingDocumentModel);
