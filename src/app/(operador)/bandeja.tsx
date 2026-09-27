import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function BandejaOperadorScreen() {
  return (
    <ThemedView style={{ flex: 1, padding: 16 }}>
      <ThemedText type="title">Bandeja de reportes</ThemedText>
      <ThemedText>
        Lista de reportes con filtros por estado, tipo y zona para el operador.
      </ThemedText>
    </ThemedView>
  );
}
