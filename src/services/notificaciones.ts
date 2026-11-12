import * as Notifications from "expo-notifications";
import AsyncStorage from "expo-sqlite/kv-store";
import { Platform } from "react-native";

import { nombreEstado } from "@/constants/estados";
import type { EstadoReporte } from "@/tipos/reporte";

/** Preferencia del vecino: si está en "no", no se muestra ningún aviso. */
const CLAVE_AVISOS = "avisos-habilitados";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function avisosHabilitados(): Promise<boolean> {
  const valor = await AsyncStorage.getItem(CLAVE_AVISOS);
  return valor !== "no";
}

export async function guardarPreferenciaAvisos(habilitados: boolean) {
  await AsyncStorage.setItem(CLAVE_AVISOS, habilitados ? "si" : "no");
}

export async function pedirPermisoNotificaciones(): Promise<boolean> {
  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Reportes",
        importance: Notifications.AndroidImportance.HIGH,
      });
    } catch (error) {
      console.warn("No se pudo crear el canal de notificaciones:", error);
    }
  }
  const { status: actual } = await Notifications.getPermissionsAsync();
  if (actual === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

async function avisar(content: { title: string; body: string }) {
  if (!(await avisosHabilitados())) return;
  const permitido = await pedirPermisoNotificaciones();
  if (!permitido) return;
  await Notifications.scheduleNotificationAsync({ content, trigger: null });
}

export async function notificarReporteEnviado(titulo: string) {
  await avisar({
    title: "Reporte enviado",
    body: `Tu reporte "${titulo}" quedó en estado ${nombreEstado("RECIBIDO")}.`,
  });
}

export async function notificarCambioDeEstado(
  titulo: string,
  estado: EstadoReporte,
) {
  await avisar({
    title: "Cambio de estado",
    body: `Tu reporte "${titulo}" pasó a ${nombreEstado(estado)}.`,
  });
}

export async function notificarVecinoSumado(titulo: string, total: number) {
  await avisar({
    title: "Un vecino se sumó",
    body: `Tu reporte "${titulo}" ya suma ${total} ${
      total === 1 ? "vecino" : "vecinos"
    }.`,
  });
}
