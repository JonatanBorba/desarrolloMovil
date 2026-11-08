import { nombreEstado } from '@/constants/estados';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function pedirPermisoNotificaciones(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Reportes',
        importance: Notifications.AndroidImportance.HIGH,
      });
    } catch (error) {
      console.warn('No se pudo crear el canal de notificaciones:', error);
    }
  }
  const { status: actual } = await Notifications.getPermissionsAsync();
  if (actual === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function notificarReporteEnviado(titulo: string) {
  const permitido = await pedirPermisoNotificaciones();
  if (!permitido) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Reporte enviado',
      body: `Tu reporte "${titulo}" quedó en estado ${nombreEstado('RECIBIDO')}.`,
    },
    trigger: null,
  });
}