import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { hashPassword } from '../auth/password.util';
import { UserSchema } from '../users/user.schema';
import { FormationSchema } from '../catalog/formation.schema';
import { LevelSchema } from '../catalog/level.schema';
import { TrainingDocumentSchema } from '../catalog/document.schema';
import { AccessGrantSchema } from '../access/access-grant.schema';
import { buildCatalog } from './build-catalog';

/** Comptes de démonstration (voir mobile/SECURITE_DES_INFORMATIONS.md). */
const DEMO_USERS = [
  {
    _id: 'usr-1',
    email: 'sophie.martin@pdftrain.io',
    password: 'demo1234',
    firstName: 'Sophie',
    lastName: 'Martin',
    role: 'LEARNER' as const,
    company: 'Groupe Ardentis',
    avatarColor: '#4F46E5',
  },
  {
    _id: 'usr-2',
    email: 'karim.benali@pdftrain.io',
    password: 'manager2024',
    firstName: 'Karim',
    lastName: 'Benali',
    role: 'MANAGER' as const,
    company: 'Groupe Ardentis',
    avatarColor: '#0EA5A4',
  },
];

/** Réplique exacte de mobile/src/core/security/access.ts. */
const DEMO_GRANTS = [
  { _id: 'usr-1:f-hse', userId: 'usr-1', formationId: 'f-hse', levelIds: [] },
  { _id: 'usr-1:f-cyber', userId: 'usr-1', formationId: 'f-cyber', levelIds: ['l-cyb-1'] },
  { _id: 'usr-1:f-angular', userId: 'usr-1', formationId: 'f-angular', levelIds: ['l-ang-1', 'l-ang-2'] },
];

@Injectable()
export class SeedService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async run(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('⚠️  Réinitialisation de la base de données…');
    await this.connection.dropDatabase();

    const FormationModel = this.connection.model('Formation', FormationSchema);
    const LevelModel = this.connection.model('Level', LevelSchema);
    const DocumentModel = this.connection.model('TrainingDocument', TrainingDocumentSchema);
    const UserModel = this.connection.model('User', UserSchema);
    const GrantModel = this.connection.model('AccessGrant', AccessGrantSchema);

    const catalog = buildCatalog();
    await FormationModel.insertMany(catalog.formations);
    await LevelModel.insertMany(catalog.levels);
    await DocumentModel.insertMany(catalog.documents);

    const users = await Promise.all(
      DEMO_USERS.map(async ({ password, ...user }) => ({
        ...user,
        passwordHash: await hashPassword(password),
      })),
    );
    await UserModel.insertMany(users);
    await GrantModel.insertMany(DEMO_GRANTS);

    // eslint-disable-next-line no-console
    console.log(
      `✅ Seed terminé : ${catalog.formations.length} formations, ` +
        `${catalog.levels.length} niveaux, ${catalog.documents.length} documents, ` +
        `${users.length} comptes utilisateurs.`,
    );
  }
}
