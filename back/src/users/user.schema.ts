import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

/**
 * Compte utilisateur.
 * `_id` porte l'identifiant métier ('usr-1', 'usr-2', …) pour rester
 * aligné sur le contrat client qui expose un champ `id`.
 */
@Schema({ collection: 'users', versionKey: false })
export class User {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true })
  firstName!: string;

  @Prop({ required: true })
  lastName!: string;

  /**
   * Nom complet dérivé (`firstName lastName`), utile pour la recherche plein
   * texte du back-office. Optionnel pour rester compatible avec les comptes
   * créés avant ce champ ; il est renseigné à la création/mise à jour.
   */
  @Prop({ type: String, default: '' })
  fullName!: string;

  @Prop({ required: true, enum: ['LEARNER', 'MANAGER'] })
  role!: 'LEARNER' | 'MANAGER';

  @Prop({ default: '' })
  company!: string;

  @Prop({ default: '#4F46E5' })
  avatarColor!: string;

  /**
   * Compte actif ? `false` = soft-disable : connexion et refresh refusés,
   * mais les données (grants, progression) sont conservées. Champ nullable
   * pour rester compatible avec les comptes seed existants.
   */
  @Prop({ type: Boolean, default: true })
  active!: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
