import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function MapaReportesScreen() {
  return (
    <ThemedView style={{ flex: 1, padding: 16 }}>
      <ThemedText type="title">Mapa de reportes</ThemedText>
      <ThemedText>
        Mapa con reportes públicos, filtros y lógica de "sumarse a un reporte".
      </ThemedText>
    </ThemedView>
  );
}
