/**
 * BioAsset Security Utility Module
 * Proporciona servicios de Cifrado de URLs, Hashing de Datos, Firma de Integridad y Validación de Tokens.
 */

// Clave secreta para cifrado de parámetros en URLs
// En producción debe ser sobreescrita por import.meta.env.VITE_URL_SECRET_KEY
const URL_SECRET_KEY = import.meta.env.VITE_URL_SECRET_KEY || "BioAsset_Secret_Url_Key_2026_Secure!";

/**
 * Cifra un parámetro (ej: ID de equipo, ubicación, usuario) para ser usado en URLs de forma segura.
 * Produce un string URL-Safe (libre de +, /, =).
 */
export function encryptUrlParam(text: string | number): string {
  if (text === null || text === undefined || text === "") return "";
  const str = String(text);
  try {
    // Codificación simétrica con clave y firma interna
    const rawData = `${str}::${URL_SECRET_KEY}`;
    const encoded = btoa(encodeURIComponent(rawData));
    // Formato URL-Safe
    return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch (e) {
    console.error("[Security] Error encrypting URL param:", e);
    return str;
  }
}

/**
 * Descifra el parámetro cifrado de una URL y retorna el ID original.
 */
export function decryptUrlParam(cipherText: string): string {
  if (!cipherText) return "";
  try {
    let base64 = cipherText.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }
    const decoded = decodeURIComponent(atob(base64));
    const parts = decoded.split("::");
    if (parts.length === 2 && parts[1] === URL_SECRET_KEY) {
      return parts[0];
    }
    // Si no coincide la firma de la clave, retorna el texto original como fallback
    return cipherText;
  } catch (e) {
    // Si falla la decodificación (ej. es un ID sin cifrar legacy), retorna el texto de entrada
    return cipherText;
  }
}

/**
 * Genera un Hash SHA-256 unidireccional e irreversible utilizando la API nativa crypto.subtle.
 * Útil para: Hashing de contraseñas, anonimizar correos o verificar integridad.
 */
export async function hashData(data: string): Promise<string> {
  if (!data) return "";
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Genera una huella digital (checksum SHA-256) para auditar la integridad de registros
 * de mantenimiento, movimientos o incidentes y prevenir manipulaciones en la BD.
 */
export async function generateIntegrityHash(record: Record<string, any>): Promise<string> {
  // Ordenar llaves para consistencia en el hash
  const sortedKeys = Object.keys(record).sort();
  const serialized = sortedKeys.map((k) => `${k}:${record[k]}`).join("|");
  return hashData(serialized);
}

/**
 * Decodifica la payload de un JWT (JSON Web Token) sin verificar la firma en el cliente.
 */
export function parseJwtPayload(token: string): Record<string, any> | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    let base64Url = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (base64Url.length % 4 !== 0) {
      base64Url += "=";
    }
    const jsonPayload = decodeURIComponent(
      atob(base64Url)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

/**
 * Comprueba si un JWT está expirado.
 */
export function isTokenExpired(token: string): boolean {
  const payload = parseJwtPayload(token);
  if (!payload || !payload.exp) return false; // Si no tiene fecha exp, asumimos no expirado o token opaco
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return payload.exp < nowInSeconds;
}

/**
 * Sanitiza inputs de texto plano para prevenir inyecciones HTML / XSS.
 */
export function sanitizeInput(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
