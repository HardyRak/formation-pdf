/**
 * Utilitaires binaires : encodage base64 et décodage UTF-8.
 *
 * Évite de dépendre de `Buffer` (indisponible sur Hermes) ou de l'API
 * `TextDecoder` (non garantie sur Hermes). Implémentations manuelles, résistantes
 * aux grandes chaînes (traitement par lots, sans récursion).
 */

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Convertit un tableau d'octets en chaîne base64 (standard, avec padding). */
export function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000; // 32 Ko
  let out = '';
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const end = Math.min(offset + chunkSize, bytes.length);
    const chunk = bytes.subarray(offset, end);
    out += encodeChunk(chunk);
  }
  return out;
}

function encodeChunk(bytes: Uint8Array): string {
  let output = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const a = bytes[i];
    const b = i + 1 < len ? bytes[i + 1] : undefined;
    const c = i + 2 < len ? bytes[i + 2] : undefined;

    const tri = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    output += B64[(tri >> 18) & 63];
    output += B64[(tri >> 12) & 63];
    output += b !== undefined ? B64[(tri >> 6) & 63] : '=';
    output += c !== undefined ? B64[tri & 63] : '=';
  }
  return output;
}

/** Convertit une chaîne base64 en tableau d'octets (pour Blob sur web). */
export function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const length = Math.floor((clean.length * 3) / 4) - padding;
  const bytes = new Uint8Array(length);
  let byteIndex = 0;
  let buffer = 0;
  let bitsCollected = 0;

  for (const char of clean) {
    if (char === '=') break;
    const value = B64.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bitsCollected += 6;
    if (bitsCollected >= 8) {
      bitsCollected -= 8;
      bytes[byteIndex++] = (buffer >> bitsCollected) & 0xff;
    }
  }
  return bytes;
}

/**
 * Décode des octets UTF-8 en chaîne. Utilise `TextDecoder` si disponible
 * (Node / certains runtimes), sinon un décodeur manuel compatible Hermes.
 */
export function bytesToUtf8(bytes: Uint8Array): string {
  const TD = (globalThis as { TextDecoder?: new () => { decode: (b: Uint8Array) => string } }).TextDecoder;
  if (TD) {
    try {
      return new TD().decode(bytes);
    } catch {
      /* on retombe sur le décodeur manuel */
    }
  }
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    const b0 = bytes[i];
    if (b0 < 0x80) {
      out += String.fromCharCode(b0);
    } else if (b0 < 0xe0 && i + 1 < bytes.length) {
      out += String.fromCharCode(((b0 & 0x1f) << 6) | (bytes[++i] & 0x3f));
    } else if (b0 < 0xf0 && i + 2 < bytes.length) {
      out += String.fromCharCode(
        ((b0 & 0x0f) << 12) | ((bytes[++i] & 0x3f) << 6) | (bytes[++i] & 0x3f),
      );
    } else if (b0 < 0xf8 && i + 3 < bytes.length) {
      out += String.fromCharCode(
        ((b0 & 0x07) << 18) |
          ((bytes[++i] & 0x3f) << 12) |
          ((bytes[++i] & 0x3f) << 6) |
          (bytes[++i] & 0x3f),
      );
    }
  }
  return out;
}

/** Construit une chaîne `data:` pour un PDF à partir des octets. */
export function pdfDataUri(bytes: Uint8Array): string {
  return `data:application/pdf;base64,${bytesToBase64(bytes)}`;
}

/** Encodage UTF-8 manuel (Hermes ne garantit pas `TextEncoder`). */
export function utf8ToBytes(text: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    // Gère les paires de substitution (UTF-16 → code point).
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const low = text.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
        i++;
      }
    }
    if (code < 0x80) {
      out.push(code);
    } else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return new Uint8Array(out);
}
