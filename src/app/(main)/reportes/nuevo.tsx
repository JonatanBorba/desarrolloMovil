import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function NuevoReporteScreen() {
  return (
    <ThemedView style={{ flex: 1, padding: 16 }}>
      <ThemedText type="title">Nuevo reporte</ThemedText>
      <ThemedText>
        Pantalla para crear un reporte con foto obligatoria, ubicación y audio.
      </ThemedText>
    </ThemedView>
  );
}
