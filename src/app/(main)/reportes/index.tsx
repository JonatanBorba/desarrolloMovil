import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function MisReportesScreen() {
  return (
    <ThemedView style={{ flex: 1, padding: 16 }}>
      <ThemedText type="title">Mis reportes</ThemedText>
      <ThemedText>
        Lista de reportes del vecino (estado, filtros, acceso al detalle).
      </ThemedText>
    </ThemedView>
  );
}
