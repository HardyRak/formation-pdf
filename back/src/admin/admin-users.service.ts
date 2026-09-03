import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiException } from '../common/api-exception';
import type { UserDto } from '../common/contracts';
import { User, UserDocument } from '../users/user.schema';
import { toUserDto } from '../users/user.mapper';
import { hashPassword } from '../auth/password.util';
import { escapeRegex } from '../common/id.util';
import type { AdminList, AnyDoc } from './admin.types';

/** Charge utile de création d'un compte (validée par le DTO). */
export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'LEARNER' | 'MANAGER';
  company?: string;
  avatarColor?: string;
}

/** Options de listage : recherche, filtre rôle, ids, pagination optionnelle. */
export interface ListUsersOptions {
  q?: string;
  role?: string;
  /** Ids séparés par des virgules (résolution des libellés en lot). */
  ids?: string;
  /** Page 1-based. Fourni (avec `limit`) ⇒ réponse paginée. */
  page?: number;
  limit?: number;
}

/**
 * CRUD des comptes utilisateurs (back-office, rôle MANAGER).
 *
 * - Création avec vérification d'unicité (email) + hachage scrypt du mot de passe.
 * - Édition partielle (tous les champs optionnels).
 * - Soft-disable via `active` (le compte ne peut plus se connecter ni rafraîchir
 *   sa session, mais ses données sont conservées).
 * - `UserDto` est le SEUL contrat exposé : `passwordHash` ne sort jamais.
 */
@Injectable()
export class AdminUsersService {
  constructor(
    @InjectModel(User.name) private readonly users: Model<UserDocument>,
  ) {}

  async listUsers(options: ListUsersOptions = {}): Promise<AdminList<UserDto>> {
    const filter: Record<string, unknown> = {};
    if (options.role && (options.role === 'LEARNER' || options.role === 'MANAGER')) {
      filter.role = options.role;
    }
    if (options.q) {
      const re = this.searchRegex(options.q);
      filter.$or = [{ email: re }, { firstName: re }, { lastName: re }, { company: re }];
    }
    if (options.ids?.trim()) {
      const ids = options.ids
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      if (ids.length > 0) filter._id = { $in: ids };
    }

    // Pagination explicite (dashboard) : count + fenêtre skip/limit.
    if (options.page !== undefined && options.limit !== undefined) {
      const page = Math.max(1, Math.floor(options.page));
      const limit = Math.max(1, Math.floor(options.limit));
      const [total, rows] = await Promise.all([
        this.users.countDocuments(filter),
        this.users
          .find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
      ]);
      return {
        total,
        items: rows.map((user) => toUserDto(user)),
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }

    // Comportement historique (selects du back-office) : toute la liste.
    const users = await this.users.find(filter).sort({ createdAt: -1 }).lean();
    return {
      total: users.length,
      items: users.map((user) => toUserDto(user)),
    };
  }

  async getUser(id: string): Promise<UserDto> {
    const user = await this.users.findById(id).lean();
    if (!user) throw new ApiException(404, 'NOT_FOUND', 'Utilisateur introuvable.');
    return toUserDto(user);
  }

  async createUser(input: CreateUserInput): Promise<UserDto> {
    const email = input.email.trim().toLowerCase();
    const exists = await this.users.findOne({ email }).lean();
    if (exists) {
      throw new ApiException(409, 'CONFLICT', 'Un compte existe déjà avec cet email.');
    }
    const passwordHash = await hashPassword(input.password);
    const _id = `usr-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    await this.users.create({
      _id,
      email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      company: input.company ?? '',
      avatarColor: input.avatarColor ?? '#4F46E5',
      active: true,
    });
    return toUserDto((await this.users.findById(_id).lean()) as AnyDoc);
  }

  async updateUser(
    id: string,
    input: Partial<CreateUserInput & { active: boolean }>,
  ): Promise<UserDto> {
    const user = await this.users.findById(id).lean();
    if (!user) throw new ApiException(404, 'NOT_FOUND', 'Utilisateur introuvable.');

    const patch: Record<string, unknown> = {};
    if (input.email !== undefined) {
      const email = input.email.trim().toLowerCase();
      const clash = await this.users.findOne({ email, _id: { $ne: id } }).lean();
      if (clash) {
        throw new ApiException(409, 'CONFLICT', 'Un compte existe déjà avec cet email.');
      }
      patch.email = email;
    }
    if (input.firstName !== undefined) patch.firstName = input.firstName;
    if (input.lastName !== undefined) patch.lastName = input.lastName;
    if (input.role !== undefined) patch.role = input.role;
    if (input.company !== undefined) patch.company = input.company;
    if (input.avatarColor !== undefined) patch.avatarColor = input.avatarColor;
    if (input.active !== undefined) patch.active = input.active;
    if (input.password !== undefined) {
      patch.passwordHash = await hashPassword(input.password);
    }

    await this.users.updateOne({ _id: id }, { $set: patch });
    return toUserDto((await this.users.findById(id).lean()) as AnyDoc);
  }

  async setActive(id: string, active: boolean): Promise<UserDto> {
    const user = await this.users.findById(id).lean();
    if (!user) throw new ApiException(404, 'NOT_FOUND', 'Utilisateur introuvable.');
    await this.users.updateOne({ _id: id }, { $set: { active } });
    return toUserDto((await this.users.findById(id).lean()) as AnyDoc);
  }

  /** Construit une regex de recherche insensible à la casse (terme échapé). */
  private searchRegex(value: string): RegExp {
    return new RegExp(escapeRegex(value.trim()), 'i');
  }
}
