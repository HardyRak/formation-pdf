import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type LevelDocument = HydratedDocument<Level>;

/** Niveau. `_id` = identifiant métier ('l-hse-1', …). */
@Schema({ collection: 'levels', versionKey: false })
export class Level {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true, index: true })
  formationId!: string;

  @Prop({ required: true })
  order!: number;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ default: 0 })
  documentsCount!: number;

  @Prop({ default: 0 })
  totalPages!: number;
}

export const LevelSchema = SchemaFactory.createForClass(Level);
