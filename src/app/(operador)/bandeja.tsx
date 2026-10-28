
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { obtenerReportes } from '@/services/almacenamientoReportes';
import type { EstadoReporte, Reporte } from '@/tipos/reporte';

const ESTADOS: Array<{ etiqueta: string; valor: EstadoReporte | 'TODOS' }> = [
  { etiqueta: 'Todos', valor: 'TODOS' },
  { etiqueta: 'Recibido', valor: 'RECIBIDO' },
  { etiqueta: 'En revisión', valor: 'EN_REVISION' },
  { etiqueta: 'Asignado', valor: 'ASIGNADO_CUADRILLA' },
  { etiqueta: 'Resuelto', valor: 'RESUELTO' },
  { etiqueta: 'Rechazado', valor: 'RECHAZADO' },
];

function nombreEstado(estado: EstadoReporte): string {
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
  }
}

export default function BandejaOperadorScreen() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [estadoSeleccionado, setEstadoSeleccionado] =
    useState<EstadoReporte | 'TODOS'>('TODOS');
  const [tipoSeleccionado, setTipoSeleccionado] = useState('TODOS');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargarReportes = useCallback(async () => {
    setCargando(true);
    setError(false);

    try {
      setReportes(await obtenerReportes());
    } catch (e) {
      console.error('Error al cargar la bandeja:', e);
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

  const tipos = ['TODOS', ...new Set(reportes.map((reporte) => reporte.tipo))];

  const reportesFiltrados = reportes.filter((reporte) => {
    const coincideEstado =
      estadoSeleccionado === 'TODOS' ||
      reporte.estadoActual === estadoSeleccionado;

    const coincideTipo =
      tipoSeleccionado === 'TODOS' ||
      reporte.tipo === tipoSeleccionado;

    return coincideEstado && coincideTipo;
  });

  return (
    <ThemedView style={styles.contenedor}>
      <ThemedText type="title">Bandeja de reportes</ThemedText>
      <ThemedText>
        Reportes guardados en este dispositivo: {reportes.length}
      </ThemedText>

      <ThemedText type="subtitle">Filtrar por estado</ThemedText>
      <View style={styles.filtros}>
        {ESTADOS.map((estado) => (
          <Pressable
            key={estado.valor}
            onPress={() => setEstadoSeleccionado(estado.valor)}
            style={[
              styles.filtro,
              estadoSeleccionado === estado.valor && styles.filtroActivo,
            ]}
          >
            <ThemedText>{estado.etiqueta}</ThemedText>
          </Pressable>
        ))}
      </View>

      <ThemedText type="subtitle">Filtrar por tipo</ThemedText>
      <View style={styles.filtros}>
        {tipos.map((tipo) => (
          <Pressable
            key={tipo}
            onPress={() => setTipoSeleccionado(tipo)}
            style={[
              styles.filtro,
              tipoSeleccionado === tipo && styles.filtroActivo,
            ]}
          >
            <ThemedText>{tipo === 'TODOS' ? 'Todos' : tipo}</ThemedText>
          </Pressable>
        ))}
      </View>

      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" />
          <ThemedText>Cargando reportes...</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.centrado}>
          <ThemedText>
            No se pudieron cargar los reportes guardados.
          </ThemedText>
          <Pressable onPress={cargarReportes} style={styles.boton}>
            <ThemedText style={styles.textoBoton}>Reintentar</ThemedText>
          </Pressable>
        </View>
      ) : reportesFiltrados.length === 0 ? (
        <View style={styles.centrado}>
          <ThemedText>
            No hay reportes que coincidan con los filtros seleccionados.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          style={styles.lista}
          data={reportesFiltrados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.contenidoLista}
          renderItem={({ item }) => (
            <Pressable
              style={styles.tarjeta}
              onPress={() =>
                router.push({
                  pathname: '/(operador)/reporte/[id]',
                  params: { id: item.id },
                })
              }
            >
              <ThemedText type="subtitle">{item.tipo}</ThemedText>
              <ThemedText>Código: {item.codigoSeguimiento}</ThemedText>
              <ThemedText>Estado: {nombreEstado(item.estadoActual)}</ThemedText>
              <ThemedText>
                {item.descripcionTexto || 'Sin descripción escrita'}
              </ThemedText>
              <ThemedText>Zona: {item.zonaId}</ThemedText>
              <ThemedText style={styles.enlace}>Abrir gestión del reporte →</ThemedText>
            </Pressable>
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
  filtros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  filtro: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#888888',
    borderRadius: 20,
  },
  filtroActivo: {
    backgroundColor: '#DCEBFF',
    borderColor: '#003785',
  },
  lista: {
    flex: 1,
    marginTop: 12,
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
    padding: 16,
  },
  boton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#003785',
  },
  textoBoton: {
    color: '#FFFFFF',
  },
  enlace: {
    marginTop: 4,
    fontWeight: 'bold',
  },
});
