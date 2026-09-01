import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type FormationDocument = HydratedDocument<Formation>;

/**
 * Formation. `_id` = identifiant métier ('f-hse', 'f-cyber', …).
 * Les compteurs (levelsCount, documentsCount, totalPages, durationMinutes)
 * sont pré-calculés au seed pour éviter les agrégations à chaque lecture.
 */
@Schema({ collection: 'formations', versionKey: false })
export class Formation {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  category!: string;

  @Prop({ required: true })
  icon!: string;

  @Prop({ required: true })
  color!: string;

  @Prop({ default: false })
  mandatory!: boolean;

  @Prop({ default: 0 })
  order!: number;

  @Prop({ default: 0 })
  levelsCount!: number;

  @Prop({ default: 0 })
  documentsCount!: number;

  @Prop({ default: 0 })
  totalPages!: number;

  @Prop({ default: 0 })
  durationMinutes!: number;
}

export const FormationSchema = SchemaFactory.createForClass(Formation);
