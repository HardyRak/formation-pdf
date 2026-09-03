/**
 * Validation de l'enrichissement des logs et de la capture d'erreurs détaillées.
 * Exécution : node -r ts-node/register scripts/validate-logs.ts
 */
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LogService } from '../src/logs/log.service';
import { LogCaptureMiddleware } from '../src/logs/log-capture.middleware';
import { ApiExceptionFilter } from '../src/common/api-exception.filter';
import { ApiException } from '../src/common/api-exception';
import { maskBody, maskHeaders, maskParams, maskUrl } from '../src/logs/mask.util';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`✗ ASSERTION ÉCHOUÉE : ${msg}`);
  console.log(`✓ ${msg}`);
}

async function main(): Promise<number> {
  console.log('--- 1. Validation du masquage des données sensibles (mask.util) ---');

  // Headers sensibles
  const headers = {
    authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeak',
    'x-api-key': 'secret-api-key-12345',
    'content-type': 'application/json',
    'user-agent': 'Mozilla/5.0',
    cookie: 'session=secret-session-id',
  };
  const maskedHeaders = maskHeaders(headers);
  assert(maskedHeaders['authorization'] === '[MASQUÉ - CONFIDENTIEL]', 'Authorization masqué');
  assert(maskedHeaders['x-api-key'] === '[MASQUÉ - CONFIDENTIEL]', 'x-api-key masqué');
  assert(maskedHeaders['cookie'] === '[MASQUÉ - CONFIDENTIEL]', 'Cookie masqué');
  assert(maskedHeaders['content-type'] === 'application/json', 'content-type conservé');

  // Corps sensible
  const body = {
    email: 'user@example.com',
    password: 'SuperSecretPassword123!',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeak',
    nested: {
      refreshToken: 'secret-refresh-token',
      name: 'Formation DevOps',
    },
    items: [{ id: 1, secret: 'shhh' }],
  };
  const maskedBodyResult = maskBody(body) as Record<string, any>;
  assert(maskedBodyResult.password === '[MASQUÉ - CONFIDENTIEL]', 'Body password masqué');
  assert(maskedBodyResult.token === '[MASQUÉ - CONFIDENTIEL]', 'Body token masqué');
  assert(maskedBodyResult.nested.refreshToken === '[MASQUÉ - CONFIDENTIEL]', 'Nested refreshToken masqué');
  assert(maskedBodyResult.nested.name === 'Formation DevOps', 'Nested non-sensible conservé');
  assert(maskedBodyResult.items[0].secret === '[MASQUÉ - CONFIDENTIEL]', 'Array object secret masqué');

  // Buffer dans body
  const buf = Buffer.from('hello pdf');
  assert(maskBody(buf) === '[Buffer 9 octets]', 'Buffer masqué avec taille');

  // Référence circulaire
  const circ: Record<string, any> = { a: 1 };
  circ.self = circ;
  const maskedCirc = maskBody(circ) as Record<string, any>;
  assert(maskedCirc.self === '[Référence circulaire]', 'Référence circulaire gérée sans crash');

  // Params / Query sensibles
  const params = {
    token: 'xyz-secret-token',
    formationId: 'f-hse',
    password: '123',
  };
  const maskedParamsResult = maskParams(params)!;
  assert(maskedParamsResult.token === '[MASQUÉ - CONFIDENTIEL]', 'Param token masqué');
  assert(maskedParamsResult.password === '[MASQUÉ - CONFIDENTIEL]', 'Param password masqué');
  assert(maskedParamsResult.formationId === 'f-hse', 'Param formationId conservé');

  // URL sensible
  const url = maskUrl('/v1/auth/callback?token=my-secret-token&id=123');
  assert(decodeURIComponent(url).includes('token=[MASQUÉ]'), 'URL token query param masqué');

  console.log('\n--- 2. Validation de ApiExceptionFilter & enrichissement des erreurs ---');
  const filter = new ApiExceptionFilter();

  // Test 2.1 : Erreur 500 inattendue (ex: MongoServerError / TypeError)
  let capturedStatus = 0;
  let capturedBody: any = null;
  const fakeReq500: any = {};
  const fakeRes500: any = {
    status: (s: number) => {
      capturedStatus = s;
      return fakeRes500;
    },
    json: (b: any) => {
      capturedBody = b;
      return fakeRes500;
    },
  };
  const host500: any = {
    switchToHttp: () => ({
      getRequest: () => fakeReq500,
      getResponse: () => fakeRes500,
    }),
  };

  const mongoError = new Error('E11000 duplicate key error collection: formation-pdf.documents index: _id_ dup key: { _id: "doc-ang-2-1" }');
  mongoError.name = 'MongoServerError';
  (mongoError as any).code = 11000;
  (mongoError as any).keyValue = { _id: 'doc-ang-2-1' };

  filter.catch(mongoError, host500);

  // Vérification de la réponse HTTP envoyée au client
  assert(capturedStatus === 500, '500 HTTP status renvoyé au client');
  assert(capturedBody.status === 500, 'ErrorBody.status = 500');
  assert(capturedBody.code === 'INTERNAL', 'ErrorBody.code = INTERNAL');
  assert(capturedBody.message === 'Erreur interne du serveur.', 'ErrorBody.message générique sécurisé pour le client');

  // Vérification des détails d'erreur enrichis attachés à la requête
  assert(fakeReq500._errorDetails !== undefined, '_errorDetails attaché à la requête');
  assert(fakeReq500._errorDetails.name === 'MongoServerError', 'Nom d\'erreur exact (MongoServerError)');
  assert(fakeReq500._errorDetails.message.includes('E11000 duplicate key error'), 'Message d\'erreur technique d\'origine capturé');
  assert(fakeReq500._errorDetails.stack !== undefined, 'Stack trace capturée');
  assert(fakeReq500._errorDetails.details.duplicateKey._id === 'doc-ang-2-1', 'Détails de clé dupliquée capturés');

  // Test 2.2 : Erreur de validation DTO (BadRequestException)
  const fakeReq400: any = {};
  const fakeRes400: any = {
    status: (s: number) => {
      capturedStatus = s;
      return fakeRes400;
    },
    json: (b: any) => {
      capturedBody = b;
      return fakeRes400;
    },
  };
  const host400: any = {
    switchToHttp: () => ({
      getRequest: () => fakeReq400,
      getResponse: () => fakeRes400,
    }),
  };

  const validationError = new BadRequestException(['name must be a string', 'order must be a positive number']);
  filter.catch(validationError, host400);

  assert(capturedStatus === 400, '400 HTTP status renvoyé au client');
  assert(fakeReq400._errorDetails.name === 'BadRequestException', 'Nom BadRequestException capturé');
  assert(fakeReq400._errorDetails.message === 'name must be a string, order must be a positive number', 'Messages de validation agrégés');
  assert(Array.isArray(fakeReq400._errorDetails.details), 'Détails des contraintes capturés sous forme de tableau');
  assert(fakeReq400._errorDetails.details.length === 2, '2 contraintes de validation');

  // Test 2.3 : ApiException métier
  const fakeReqMetier: any = {};
  const fakeResMetier: any = {
    status: (s: number) => {
      capturedStatus = s;
      return fakeResMetier;
    },
    json: (b: any) => {
      capturedBody = b;
      return fakeResMetier;
    },
  };
  const hostMetier: any = {
    switchToHttp: () => ({
      getRequest: () => fakeReqMetier,
      getResponse: () => fakeResMetier,
    }),
  };

  const apiEx = new ApiException(404, 'NOT_FOUND', 'Formation introuvable.');
  filter.catch(apiEx, hostMetier);

  assert(capturedStatus === 404, '404 HTTP status');
  assert(capturedBody.code === 'NOT_FOUND', 'Code NOT_FOUND');
  assert(fakeReqMetier._errorDetails.name === 'ApiException', 'Nom ApiException');
  assert(fakeReqMetier._errorDetails.message === 'Formation introuvable.', 'Message Formation introuvable.');

  console.log('\n--- 3. Validation de LogService & LogCaptureMiddleware ---');
  const fakeConfig = {
    get: (k: string) => (k === 'logBufferSize' ? 5 : undefined),
  } as unknown as ConfigService;

  const logService = new LogService(fakeConfig);
  const middleware = new LogCaptureMiddleware(logService);

  // Simule une requête avec erreur 500
  const listeners: Record<string, () => void> = {};

  const mockReq: any = {
    method: 'POST',
    originalUrl: '/v1/admin/levels/l-ang-2/documents',
    url: '/v1/admin/levels/l-ang-2/documents',
    path: '/v1/admin/levels/l-ang-2/documents',
    ip: '127.0.0.1',
    headers: {
      'user-agent': 'Mozilla/5.0 Jest',
      'authorization': 'Bearer confidential-token',
    },
    body: {
      title: 'English Document 2',
      password: 'do-not-show-this',
    },
    params: {
      id: 'l-ang-2',
    },
    query: {},
    user: {
      id: 'usr-2',
      email: 'karim.benali@pdftrain.io',
      role: 'MANAGER',
    },
    _errorDetails: fakeReq500._errorDetails,
  };

  const mockRes: any = {
    statusCode: 500,
    getHeaders: () => ({ 'content-type': 'application/json' }),
    on: (evt: string, cb: () => void) => {
      listeners[evt] = cb;
    },
  };

  let nextCalled: boolean = false;
  middleware.use(mockReq, mockRes, () => {
    nextCalled = true;
  });

  assert(Boolean(nextCalled), 'next() appelé par le middleware');
  assert(typeof listeners['finish'] === 'function', 'Listener finish enregistré');

  // Déclencher finish
  listeners['finish']();

  const entries = logService.getEntries();
  assert(entries.length === 1, '1 entrée enregistrée dans LogService');

  const entry = entries[0];
  assert(entry.method === 'POST', 'Méthode POST');
  assert(entry.url === '/v1/admin/levels/l-ang-2/documents', 'URL correcte');
  assert(entry.statusCode === 500, 'Status code 500');
  assert(entry.user?.email === 'karim.benali@pdftrain.io', 'Utilisateur tracé');
  assert(entry.params?.id === 'l-ang-2', 'Paramètres de route tracés');
  assert((entry.requestBody as any).password === '[MASQUÉ - CONFIDENTIEL]', 'Corps sensible masqué');
  assert((entry.requestHeaders as any).authorization === '[MASQUÉ - CONFIDENTIEL]', 'En-tête Authorization masqué');
  assert(entry.error !== null && entry.error !== undefined, 'error attaché à LogEntry');
  assert(entry.error?.name === 'MongoServerError', 'error.name = MongoServerError');
  assert(Boolean(entry.error?.message.includes('E11000 duplicate key error')), 'error.message technique conservé');
  assert(Boolean(entry.error?.stack !== undefined), 'error.stack conservé');

  console.log('\n✅ TOUS LES TESTS DE JOURNALISATION ENRICHIE PASSENT AVEC SUCCÈS.');
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
