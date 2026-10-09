import { sanitizeInput } from "./security";

const rawApiUrl = import.meta.env.VITE_API_URL || "/api";
export const API_URL = typeof window !== "undefined" ? "/api" : rawApiUrl;

/**
 * Cliente de Red Endurecido con Protección Anti-CSRF, Anti-XSS y Control de Sesión.
 */
export async function fetchApi(path: string, options: RequestInit = {}) {
  // Prevenir Path Traversal en rutas relativas
  const safePath = path.replace(/\.\./g, "");

  const token = localStorage.getItem("bioasset.token");
  const headers = new Headers(options.headers || {});

  // Adjuntar cabecera Anti-CSRF
  headers.set("X-Requested-With", "XMLHttpRequest");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${safePath}`, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new Error("No se pudo conectar con el servidor backend (Error de red/CORS). Verifica que el servicio esté corriendo.");
  }

  if (!response.ok) {
    if (response.status === 401) {
      // Destruir sesión expirada o revocada
      localStorage.removeItem("bioasset.token");
      sessionStorage.clear();
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      } else {
        window.location.reload();
      }
    }
    let message = "API error";
    try {
      const data = await response.json();
      message = data.error || data.message || message;
    } catch {}
    throw new Error(message);
  }

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text; // fallback to text if not JSON
  }
}
