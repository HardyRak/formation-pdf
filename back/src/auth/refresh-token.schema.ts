import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

/**
 * Jetons de rafraîchissement.
 * On stocke uniquement le hash (sha256) du jeton, jamais le jeton en clair.
 * `_id` = hash du jeton. La rotation et la révocation sont gérées par AuthService.
 */
@Schema({ collection: 'refresh_tokens', versionKey: false })
export class RefreshToken {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true })
  expiresAt!: Date;

  @Prop({ default: false })
  revoked!: boolean;

  @Prop({ type: String, default: null })
  replacedByHash!: string | null;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
