/**
 * Configuration Jest (tests unitaires & d'intégration).
 *
 * - ts-jest transforme le TypeScript avec le tsconfig.json du projet.
 * - Les tests sont découverts sous le dossier test/.
 * - Le build (tsconfig.build.json) exclut deja test/ et les fichiers *.spec.ts :
 *   les tests n'entrent donc pas dans l'artefact de production.
 */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: 'test/.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
};
