import {
  apiUno,
  borrarItemSeguro,
  escribirItemSeguro,
  leerItemSeguro,
  ROLE_KEY,
  TOKEN_KEY,
  USER_KEY,
} from "@/services/api";
import type { SesionApi, UsuarioApi } from "@/tipos/api";

export type UserRole = UsuarioApi["rol"];

export interface Sesion {
  token: string;
  role: UserRole;
  usuario: UsuarioApi;
}

async function guardarSesion(sesion: SesionApi): Promise<Sesion> {
  await escribirItemSeguro(TOKEN_KEY, sesion.token);
  await escribirItemSeguro(ROLE_KEY, sesion.usuario.rol);
  await escribirItemSeguro(USER_KEY, JSON.stringify(sesion.usuario));

  return {
    token: sesion.token,
    role: sesion.usuario.rol,
    usuario: sesion.usuario,
  };
}

/** Ingresa con email y contraseña */
export async function iniciarSesion(
  email: string,
  contrasena: string,
): Promise<Sesion> {
  const sesion = await apiUno<SesionApi>("/auth/ingreso", {
    method: "POST",
    body: { email, contrasena },
    conSesion: false,
  });

  return guardarSesion(sesion);
}

/** Crea una cuenta de vecino */
export async function registrarse(
  nombre: string,
  email: string,
  contrasena: string,
): Promise<Sesion> {
  const sesion = await apiUno<SesionApi>("/auth/registro", {
    method: "POST",
    body: { nombre, email, contrasena },
    conSesion: false,
  });

  return guardarSesion(sesion);
}

export async function getStoredSession(): Promise<{
  token: string;
  role: UserRole;
  usuario: UsuarioApi | null;
} | null> {
  const token = await leerItemSeguro(TOKEN_KEY);
  const role = (await leerItemSeguro(ROLE_KEY)) as UserRole | null;

  if (!token || !role) {
    return null;
  }

  const crudo = await leerItemSeguro(USER_KEY);
  let usuario: UsuarioApi | null = null;
  if (crudo) {
    try {
      usuario = JSON.parse(crudo) as UsuarioApi;
    } catch {
      usuario = null;
    }
  }

  return { token, role, usuario };
}

export async function logout() {
  await borrarItemSeguro(TOKEN_KEY);
  await borrarItemSeguro(ROLE_KEY);
  await borrarItemSeguro(USER_KEY);
}
