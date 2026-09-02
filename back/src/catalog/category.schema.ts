import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";

export type CategoryDocument = HydratedDocument<Category>;

/**
 * Catégorie de formation (référentiel géré en base).
 *
 * Auparavant `category` n'était qu'une chaîne libre sur chaque formation ;
 * c'est désormais une entité dédiée (nom unique) pour proposer une liste
 * fiable, permettre la création à la volée et le renommage en cascade.
 * Le champ `Formation.category` reste une chaîne (le nom) pour rester
 * compatible avec l'app mobile et les anciens documents.
 */
@Schema({ collection: "categories", versionKey: false })
export class Category {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true, unique: true, trim: true })
  name!: string;

  @Prop({ default: 0 })
  order!: number;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
