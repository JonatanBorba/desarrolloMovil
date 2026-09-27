import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useLocalSearchParams } from 'expo-router';

export default function DetalleReporteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ThemedView style={{ flex: 1, padding: 16 }}>
      <ThemedText type="title">Detalle del reporte</ThemedText>
      <ThemedText>Código: {id}</ThemedText>
      <ThemedText>
        Timeline de estados, fotos, audio y QR para mostrar en el mostrador.
      </ThemedText>
    </ThemedView>
  );
}
