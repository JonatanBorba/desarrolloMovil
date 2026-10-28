
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  guardarReporte,
  obtenerReportes,
} from '@/services/almacenamientoReportes';
import type { Reporte } from '@/tipos/reporte';

const REGION_INICIAL = {
  latitude: -33.0094,
  longitude: -58.5172,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

function tieneCoordenadasValidas(reporte: Reporte) {
  return (
    Number.isFinite(reporte.latitud) &&
    Number.isFinite(reporte.longitud) &&
    Math.abs(reporte.latitud) <= 90 &&
    Math.abs(reporte.longitud) <= 180 &&
    !(reporte.latitud === 0 && reporte.longitud === 0)
  );
}

export default function MapaReportesScreen() {
  const mapaRef = useRef<MapView | null>(null);

  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tipoFiltro, setTipoFiltro] = useState('TODOS');
  const [reporteSeleccionado, setReporteSeleccionado] =
    useState<Reporte | null>(null);
  const [mostrarUbicacion, setMostrarUbicacion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useFocusEffect(
    useCallback(() => {
      let activo = true;

      async function cargarYUbicarReportes() {
        setCargando(true);
        setMensaje('');

        try {
          const guardados = await obtenerReportes();

          if (!activo) return;

          setReportes(guardados);

          const publicosConUbicacion = guardados.filter(
            (reporte) =>
              reporte.esPublico && tieneCoordenadasValidas(reporte)
          );

          if (publicosConUbicacion.length > 0) {
            const primero = publicosConUbicacion[0];

            mapaRef.current?.animateToRegion(
              {
                latitude: primero.latitud,
                longitude: primero.longitud,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
              },
              700
            );
          }
        } catch (error) {
          console.error('Error al cargar reportes para el mapa:', error);

          if (activo) {
            setMensaje('No se pudieron cargar los reportes.');
          }
        } finally {
          if (activo) {
            setCargando(false);
          }
        }
      }

      cargarYUbicarReportes();

      return () => {
        activo = false;
      };
    }, [])
  );

  const reportesPublicos = reportes.filter(
    (reporte) => reporte.esPublico && tieneCoordenadasValidas(reporte)
  );

  const tiposDisponibles = [
    'TODOS',
    ...Array.from(new Set(reportesPublicos.map((reporte) => reporte.tipo))),
  ];

  const reportesFiltrados =
    tipoFiltro === 'TODOS'
      ? reportesPublicos
      : reportesPublicos.filter((reporte) => reporte.tipo === tipoFiltro);

  async function centrarEnMiUbicacion() {
    setMensaje('');

    try {
      const permiso =
        await Location.requestForegroundPermissionsAsync();

      if (permiso.status !== 'granted') {
        setMostrarUbicacion(false);
        setMensaje(
          'Necesitás permitir el acceso a la ubicación para mostrar dónde estás.'
        );
        return;
      }

      const ubicacion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const region = {
        latitude: ubicacion.coords.latitude,
        longitude: ubicacion.coords.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      };

      setMostrarUbicacion(true);
      mapaRef.current?.animateToRegion(region, 700);
    } catch (error) {
      console.error('Error al obtener la ubicación:', error);
      setMensaje('No se pudo obtener tu ubicación. Intentá nuevamente.');
    }
  }

  async function sumarseAlReporte(reporte: Reporte) {
    if (guardando) return;

    setGuardando(true);
    setMensaje('');

    try {
      const actualizado: Reporte = {
        ...reporte,
        vecinosSumados: reporte.vecinosSumados + 1,
      };

      await guardarReporte(actualizado);

      setReportes((anteriores) =>
        anteriores.map((item) =>
          item.id === actualizado.id ? actualizado : item
        )
      );

      setReporteSeleccionado(actualizado);
      setMensaje('Tu adhesión quedó registrada en este dispositivo.');
    } catch (error) {
      console.error('Error al sumarse al reporte:', error);
      setMensaje('No se pudo registrar la adhesión.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <ThemedView style={styles.contenedor}>
      <ThemedText type="title">Mapa de reportes</ThemedText>

      <ThemedText style={styles.descripcion}>
        Explorá los reclamos públicos y seleccioná un marcador para ver sus
        detalles.
      </ThemedText>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtros}
      >
        {tiposDisponibles.map((tipo) => {
          const seleccionado = tipoFiltro === tipo;

          return (
            <Pressable
              key={tipo}
              onPress={() => {
                setTipoFiltro(tipo);
                setReporteSeleccionado(null);
              }}
              style={[
                styles.filtro,
                seleccionado && styles.filtroActivo,
              ]}
            >
              <ThemedText
                style={[
                  styles.textoFiltro,
                  seleccionado && styles.textoFiltroActivo,
                ]}
              >
                {tipo === 'TODOS' ? 'Todos' : tipo}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.mapaContenedor}>
        <MapView
          ref={mapaRef}
          style={styles.mapa}
          initialRegion={REGION_INICIAL}
          showsUserLocation={mostrarUbicacion}
          showsMyLocationButton={false}
          toolbarEnabled
        >
          {reportesFiltrados.map((reporte) => (
            <Marker
              key={reporte.id}
              coordinate={{
                latitude: reporte.latitud,
                longitude: reporte.longitud,
              }}
              title={reporte.tipo}
              description={reporte.direccionDescripcion}
              onPress={() => setReporteSeleccionado(reporte)}
            >
              <Callout onPress={() => setReporteSeleccionado(reporte)}>
                <View style={styles.callout}>
                  <ThemedText type="subtitle">{reporte.tipo}</ThemedText>
                  <ThemedText>{reporte.direccionDescripcion}</ThemedText>
                  <ThemedText>
                    Estado: {reporte.estadoActual.replace(/_/g, ' ')}
                  </ThemedText>
                  <ThemedText>
                    Tocá para ver las opciones del reporte.
                  </ThemedText>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>

        <Pressable
          style={styles.botonUbicacion}
          onPress={centrarEnMiUbicacion}
        >
          <ThemedText style={styles.textoBoton}>Mi ubicación</ThemedText>
        </Pressable>

        {cargando && (
          <View style={styles.cargando}>
            <ActivityIndicator size="large" />
            <ThemedText>Cargando reportes...</ThemedText>
          </View>
        )}
      </View>

      {!cargando && reportesFiltrados.length === 0 && (
        <ThemedText style={styles.aviso}>
          No hay reportes públicos con coordenadas para este filtro.
        </ThemedText>
      )}

      {reporteSeleccionado && (
        <View style={styles.tarjeta}>
          <ThemedText type="subtitle">
            {reporteSeleccionado.tipo}
          </ThemedText>

          <ThemedText>
            {reporteSeleccionado.descripcionTexto || 'Sin descripción'}
          </ThemedText>

          <ThemedText>
            Dirección: {reporteSeleccionado.direccionDescripcion}
          </ThemedText>

          <ThemedText>
            Estado:{' '}
            {reporteSeleccionado.estadoActual.replace(/_/g, ' ')}
          </ThemedText>

          <ThemedText>
            Vecinos sumados: {reporteSeleccionado.vecinosSumados}
          </ThemedText>

          <Pressable
            disabled={guardando}
            onPress={() => sumarseAlReporte(reporteSeleccionado)}
            style={[
              styles.botonAdhesion,
              guardando && styles.botonDeshabilitado,
            ]}
          >
            <ThemedText style={styles.textoBoton}>
              {guardando ? 'Guardando...' : 'Sumarme a este reporte'}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => setReporteSeleccionado(null)}
            style={styles.botonCerrar}
          >
            <ThemedText>Cerrar detalle</ThemedText>
          </Pressable>
        </View>
      )}

      {mensaje ? <ThemedText style={styles.aviso}>{mensaje}</ThemedText> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    padding: 12,
    gap: 10,
  },
  descripcion: {
    marginBottom: 2,
  },
  filtros: {
    gap: 8,
    paddingVertical: 4,
  },
  filtro: {
    borderWidth: 1,
    borderColor: '#246B45',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filtroActivo: {
    backgroundColor: '#246B45',
  },
  textoFiltro: {
    fontSize: 13,
  },
  textoFiltroActivo: {
    color: '#FFFFFF',
  },
  mapaContenedor: {
    flex: 1,
    minHeight: 260,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapa: {
    flex: 1,
  },
  botonUbicacion: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#246B45',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textoBoton: {
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  cargando: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFFCC',
  },
  aviso: {
    paddingVertical: 6,
  },
  tarjeta: {
    borderWidth: 1,
    borderColor: '#888888',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  botonAdhesion: {
    backgroundColor: '#246B45',
    borderRadius: 10,
    padding: 14,
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  botonCerrar: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  callout: {
    width: 210,
    gap: 6,
    padding: 4,
  },
});
