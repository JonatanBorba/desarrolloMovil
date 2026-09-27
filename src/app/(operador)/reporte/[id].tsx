import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLocalSearchParams } from 'expo-router';

export default function DetalleOperadorReporteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ThemedView style={{ flex: 1, padding: 16 }}>
      <ThemedText type="title">Gestionar reporte</ThemedText>
      <ThemedText>ID: {id}</ThemedText>
      <ThemedText>
        Cambiar estado, marcar duplicado, asignar cuadrilla y subir foto de cierre.
      </ThemedText>
    </ThemedView>
  );
}
