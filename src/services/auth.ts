import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type UserRole = "vecino" | "operador";

const TOKEN_KEY = "sessionToken";
const ROLE_KEY = "sessionRole";

export async function loginMock(
  email: string,
  password: string,
  role: UserRole,
) {
  // Credenciales hardcodeadas de ejemplo
  const validCredentials = {
    vecino: {
      email: "vecino@example.com",
      password: "vecino123",
    },
    operador: {
      email: "operador@example.com",
      password: "operador123",
    },
  } as const;

  const expected = validCredentials[role];

  if (email !== expected.email || password !== expected.password) {
    throw new Error("Credenciales inválidas");
  }

  // Simulamos un token JWT cualquiera
  const fakeToken = `fake-token-${role}-${Date.now()}`;

  // En Web, SecureStore no está soportado: solo devolvemos el token sin persistir.
  if (Platform.OS !== "web") {
    await SecureStore.setItemAsync(TOKEN_KEY, fakeToken);
    await SecureStore.setItemAsync(ROLE_KEY, role);
  }

  return {
    token: fakeToken,
    role,
  } as const;
}

export async function getStoredSession() {
  if (Platform.OS === "web") {
    // En Web, por ahora no persistimos sesión; siempre volvemos null.
    return null;
  }

  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  const role = (await SecureStore.getItemAsync(ROLE_KEY)) as UserRole | null;

  if (!token || !role) {
    return null;
  }

  return { token, role } as const;
}

export async function logout() {
  if (Platform.OS === "web") {
    return;
  }

  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(ROLE_KEY);
}