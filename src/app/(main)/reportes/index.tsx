
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { obtenerReportes } from '@/services/almacenamientoReportes';
import type { Reporte } from '@/tipos/reporte';

function nombreEstado(estado: Reporte['estadoActual']): string {
  switch (estado) {
    case 'RECIBIDO':
      return 'Recibido';
    case 'EN_REVISION':
      return 'En revisión';
    case 'ASIGNADO_CUADRILLA':
      return 'Asignado a una cuadrilla';
    case 'RESUELTO':
      return 'Resuelto';
    case 'RECHAZADO':
      return 'Rechazado';
    default:
      return estado;
  }
}

export default function MisReportesScreen() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargarReportes = useCallback(async () => {
    setCargando(true);
    setError(false);

    try {
      const guardados = await obtenerReportes();
      setReportes(guardados);
    } catch (e) {
      console.error('Error al cargar Mis reportes:', e);
      setError(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarReportes();
    }, [cargarReportes])
  );

  return (
    <ThemedView style={styles.contenedor}>
      <ThemedText type="title">Mis reportes</ThemedText>

      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" />
          <ThemedText> Cargando reportes...</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.centrado}>
          <ThemedText>
            No se pudieron cargar los reportes guardados.
          </ThemedText>
        </View>
      ) : reportes.length === 0 ? (
        <View style={styles.centrado}>
          <ThemedText>
            Todavía no tenés reportes guardados en este dispositivo.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          style={styles.lista}
          data={reportes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.contenidoLista}
          renderItem={({ item }) => (
            <View style={styles.tarjeta}>
              <ThemedText type="subtitle">{item.tipo}</ThemedText>

              <ThemedText>
                Código: {item.codigoSeguimiento}
              </ThemedText>

              <ThemedText>
                Estado: {nombreEstado(item.estadoActual)}
              </ThemedText>

              <ThemedText>
                {item.descripcionTexto || 'Sin descripción'}
              </ThemedText>

              <ThemedText>
                Ubicación: {item.direccionDescripcion}
              </ThemedText>

              <ThemedText
                style={styles.enlace}
                onPress={() =>
                  router.push({
                    pathname: '/reportes/[id]',
                    params: { id: item.id },
                  })
                }
              >
                Ver detalle
              </ThemedText>
            </View>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    padding: 16,
  },
  lista: {
    flex: 1,
    marginTop: 16,
  },
  contenidoLista: {
    paddingBottom: 24,
    gap: 12,
  },
  tarjeta: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#888888',
    gap: 8,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  enlace: {
    marginTop: 4,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});
