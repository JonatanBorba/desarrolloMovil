import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function CuadrillasScreen() {
  return (
    <ThemedView style={{ flex: 1, padding: 16 }}>
      <ThemedText type="title">Zonas y cuadrillas</ThemedText>
      <ThemedText>
        Pantalla para listar las zonas de mantenimiento y sus cuadrillas.
      </ThemedText>
    </ThemedView>
  );
}
