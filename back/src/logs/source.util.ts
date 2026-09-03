import type { Request } from 'express';

export type ClientPlatform = 'MOBILE' | 'WEB' | 'API' | 'UNKNOWN';

export interface LogClientSource {
  /** Plateforme normalisée : MOBILE | WEB | API | UNKNOWN */
  platform: ClientPlatform;
  /** Libellé lisible et précis de l'application cliente */
  app: string;
  /** En-tête X-Client-App si fourni */
  clientApp?: string;
  /** En-tête X-Client-Platform si fourni */
  clientPlatform?: string;
  /** Système d'exploitation détecté (iOS, Android, macOS, Windows, Linux) */
  os?: string;
  /** Libellé compact pour les lignes de journal console : « [MOBILE] App Mobile » */
  label: string;
}

/**
 * Détecte la source d'une requête entrante (application Mobile, Back-Office Web, outil API, etc.).
 *
 * Priorité :
 * 1. En-têtes applicatifs explicites (`X-Client-App`, `X-Client-Platform`) envoyés par les clients HTTP
 *    (mobile/src/core/api/http-client.ts et back-office/src/shared/api/client.ts).
 * 2. User-Agent (Expo, React Native, okhttp, CFNetwork, Postman, cURL, navigateurs Web).
 * 3. En-têtes Sec-Ch-Ua-Mobile et routes cibles (/admin).
 */
export function detectClientSource(req: Request): LogClientSource {
  const clientAppHeader = readHeader(
    req.headers['x-client-app'] || req.headers['x-app-name'] || req.headers['x-client-source'],
  );
  const clientPlatformHeader = readHeader(req.headers['x-client-platform']);
  const userAgent = readHeader(req.headers['user-agent']);
  const secChUaMobile = readHeader(req.headers['sec-ch-ua-mobile']);

  const os = detectOs(userAgent);

  // 1. En-têtes applicatifs explicites : Mobile
  const lowerApp = clientAppHeader.toLowerCase();
  const lowerPlatform = clientPlatformHeader.toLowerCase();

  if (
    lowerApp.includes('mobile') ||
    lowerApp.includes('pdf-formation-mobile') ||
    lowerPlatform === 'mobile' ||
    lowerPlatform === 'ios' ||
    lowerPlatform === 'android'
  ) {
    const osSuffix = os ? ` (${os})` : '';
    return {
      platform: 'MOBILE',
      app: `Application Mobile (PDF Formation)${osSuffix}`,
      clientApp: clientAppHeader || undefined,
      clientPlatform: clientPlatformHeader || undefined,
      os,
      label: `[MOBILE] App Mobile${osSuffix}`,
    };
  }

  // 2. En-têtes applicatifs explicites : Back-Office Web
  if (
    lowerApp.includes('back-office') ||
    lowerApp.includes('backoffice') ||
    lowerApp.includes('pdf-formation-backoffice') ||
    lowerPlatform === 'web'
  ) {
    const osSuffix = os ? ` (${os})` : '';
    return {
      platform: 'WEB',
      app: `Back-Office Web (PDF Formation)${osSuffix}`,
      clientApp: clientAppHeader || undefined,
      clientPlatform: clientPlatformHeader || undefined,
      os,
      label: `[WEB] Back-Office${osSuffix}`,
    };
  }

  // 3. Détection heuristique via User-Agent
  const uaLower = userAgent.toLowerCase();

  // 3.1. Outils d'API / Développeur / Tests
  if (uaLower.includes('curl/')) {
    return {
      platform: 'API',
      app: 'cURL',
      os,
      label: '[API] cURL',
    };
  }
  if (uaLower.includes('postmanruntime')) {
    return {
      platform: 'API',
      app: 'Postman',
      os,
      label: '[API] Postman',
    };
  }
  if (uaLower.includes('insomnia/')) {
    return {
      platform: 'API',
      app: 'Insomnia',
      os,
      label: '[API] Insomnia',
    };
  }
  if (
    uaLower.includes('node-fetch') ||
    uaLower.includes('axios') ||
    uaLower.includes('undici') ||
    uaLower.includes('supertest')
  ) {
    return {
      platform: 'API',
      app: 'Client HTTP / Script de test',
      os,
      label: '[API] Script / Tests',
    };
  }

  // 3.2. Applications mobiles natives (React Native / Expo / okhttp / CFNetwork)
  if (
    uaLower.includes('expo') ||
    uaLower.includes('okhttp') ||
    uaLower.includes('cfnetwork') ||
    uaLower.includes('reactnative')
  ) {
    const osSuffix = os ? ` (${os})` : '';
    return {
      platform: 'MOBILE',
      app: `Application Mobile${osSuffix}`,
      os,
      label: `[MOBILE] App Mobile${osSuffix}`,
    };
  }

  // 3.3. Navigateurs Web
  if (
    uaLower.includes('mozilla') ||
    uaLower.includes('chrome') ||
    uaLower.includes('safari') ||
    uaLower.includes('firefox') ||
    uaLower.includes('edge')
  ) {
    const isMobileBrowser =
      secChUaMobile === '?1' ||
      uaLower.includes('mobile') ||
      uaLower.includes('android') ||
      uaLower.includes('iphone');
    const browserName = detectBrowser(userAgent);
    const osSuffix = os ? ` · ${os}` : '';

    if (isMobileBrowser) {
      return {
        platform: 'MOBILE',
        app: `Navigateur Mobile (${browserName}${osSuffix})`,
        os,
        label: `[MOBILE] Web Mobile (${browserName})`,
      };
    }

    const isBackOfficeRoute =
      req.originalUrl?.includes('/admin') ||
      req.url?.includes('/admin') ||
      req.originalUrl?.includes('/logs') ||
      req.url?.includes('/logs');
    const appTitle = isBackOfficeRoute ? 'Back-Office Web' : 'Application Web';

    return {
      platform: 'WEB',
      app: `${appTitle} (${browserName}${osSuffix})`,
      os,
      label: `[WEB] ${appTitle} (${browserName})`,
    };
  }

  // 3.4. Cas non identifié
  if (userAgent) {
    return {
      platform: 'UNKNOWN',
      app: userAgent.slice(0, 60),
      os,
      label: `[UNKNOWN] ${userAgent.slice(0, 30)}`,
    };
  }

  return {
    platform: 'UNKNOWN',
    app: 'Client Inconnu',
    label: '[UNKNOWN] Inconnu',
  };
}

function detectOs(userAgent: string): string | undefined {
  const ua = userAgent.toLowerCase();
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'iOS';
  if (ua.includes('macintosh') || ua.includes('mac os x')) return 'macOS';
  if (ua.includes('windows nt')) return 'Windows';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('cfnetwork') || ua.includes('darwin')) return 'iOS/macOS';
  return undefined;
}

function detectBrowser(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('chrome/') && !ua.includes('edg/')) return 'Chrome';
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'Safari';
  if (ua.includes('firefox/')) return 'Firefox';
  return 'Navigateur';
}

function readHeader(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.join(', ').trim();
  return (value ?? '').trim();
}
