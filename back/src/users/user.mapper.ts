import type { UserDto } from '../common/contracts';
import type { User } from './user.schema';

/**
 * Forme minimale d'un utilisateur mappable (document Mongoose `lean` ou
 * instance de la classe `User`). Tous les champs métier sont optionnels car
 * les documents `lean` peuvent transporter des champs absents (données
 * pré-migration), voire `undefined`.
 */
export type MappableUser = Partial<User> & { _id: string };

/**
 * Convertit un document utilisateur en DTO API (`UserDto`).
 *
 * C'est le SEUL endroit où l'objet `User` est projeté vers l'API : garantir que
 * `passwordHash` (et tout autre champ interne) n'est jamais exposé.
 */
export function toUserDto(user: MappableUser): UserDto {
  return {
    id: user._id,
    email: user.email ?? '',
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    role: user.role ?? 'LEARNER',
    company: user.company ?? '',
    avatarColor: user.avatarColor ?? '#4F46E5',
  };
}
