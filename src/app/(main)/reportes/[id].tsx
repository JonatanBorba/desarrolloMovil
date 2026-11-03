
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { obtenerReportePorId } from '@/services/almacenamientoReportes';
import type { EstadoReporte, Reporte } from '@/tipos/reporte';
import QRCode from 'react-native-qrcode-svg';

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

function fechaLegible(fecha: string): string {
  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return fecha;
  }

  return valor.toLocaleString('es-AR');
}

export default function DetalleReporteScreen() {
  const parametros = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(parametros.id) ? parametros.id[0] : parametros.id;

  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const audioPlayer = useAudioPlayer(null);
  const estadoAudio = useAudioPlayerStatus(audioPlayer);

  const audioUrl =
    reporte?.descripcionAudioUrlLocal ??
    reporte?.descripcionAudioUrlRemota ??
    null;

  useEffect(() => {
  if (audioUrl) {
    audioPlayer.replace(audioUrl);
  }

  return () => {
    // No llamar pause() durante la limpieza:
    // el reproductor puede haber sido liberado.
  };
}, [audioUrl, audioPlayer]);

  const cargarReporte = useCallback(async () => {
    if (!id) {
      setReporte(null);
      setCargando(false);
      return;
    }

    setCargando(true);
    setError(false);

    try {
      const guardado = await obtenerReportePorId(id);
      setReporte(guardado);
    } catch (e) {
      console.error('Error al cargar el detalle del reporte:', e);
      setError(true);
    } finally {
      setCargando(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      cargarReporte();

      
    }, [cargarReporte, audioPlayer])
  );

  const alternarReproduccion = () => {
    if (estadoAudio.playing) {
      audioPlayer.pause();
      return;
    }

    if (
      estadoAudio.duration > 0 &&
      estadoAudio.currentTime >= estadoAudio.duration
    ) {
      audioPlayer.seekTo(0);
    }

    audioPlayer.play();
  };

  if (cargando) {
    return (
      <ThemedView style={styles.contenedor}>
        <ActivityIndicator size="large" />
        <ThemedText>Cargando detalle del reporte...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.contenedor}>
        <ThemedText type="title">No se pudo cargar el reporte</ThemedText>
        <ThemedText>Volvé a intentarlo.</ThemedText>
      </ThemedView>
    );
  }

  if (!reporte) {
    return (
      <ThemedView style={styles.contenedor}>
        <ThemedText type="title">Reporte no encontrado</ThemedText>
        <ThemedText>
          No encontramos un reporte guardado con ese identificador.
        </ThemedText>
      </ThemedView>
    );
  }

  const fotos = [
    reporte.fotoPrincipalUrlLocal ?? reporte.fotoPrincipalUrlRemota,
    reporte.fotoSecundariaUrlLocal ?? reporte.fotoSecundariaUrlRemota,
  ].filter((foto): foto is string => Boolean(foto));

  return (
    <ThemedView style={styles.contenedor}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <ThemedText type="title">Detalle del reporte</ThemedText>

        <View style={styles.tarjeta}>
          <ThemedText type="subtitle">{reporte.tipo}</ThemedText>
          <ThemedText>
            Código de seguimiento: {reporte.codigoSeguimiento}
          </ThemedText>
          <ThemedText>
            Estado actual: {nombreEstado(reporte.estadoActual)}
          </ThemedText>
          <ThemedText>
            Descripción: {reporte.descripcionTexto || 'Sin descripción'}
          </ThemedText>
          <ThemedText>
            Dirección: {reporte.direccionDescripcion}
          </ThemedText>
          <ThemedText>
            Fecha de creación: {fechaLegible(reporte.cambios[0]?.fecha ?? '')}
          </ThemedText>
        </View>

        <ThemedText type="subtitle">Fotos adjuntas</ThemedText>

        {fotos.length > 0 ? (
          <View style={styles.fotos}>
            {fotos.map((foto, indice) => (
              <Image
                key={`${foto}-${indice}`}
                source={{ uri: foto }}
                style={styles.foto}
                resizeMode="cover"
              />
            ))}
          </View>
        ) : (
          <ThemedText>No hay fotos disponibles.</ThemedText>
        )}

        <ThemedText type="subtitle">Historial de estados</ThemedText>

        {reporte.cambios.length > 0 ? (
          reporte.cambios.map((cambio) => (
            <View key={cambio.id} style={styles.evento}>
              <View style={styles.punto} />
              <View style={styles.eventoContenido}>
                <ThemedText type="subtitle">
                  {nombreEstado(cambio.estado)}
                </ThemedText>
                <ThemedText>{fechaLegible(cambio.fecha)}</ThemedText>
                {cambio.comentario ? (
                  <ThemedText>{cambio.comentario}</ThemedText>
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <ThemedText>
            Todavía no hay cambios de estado registrados.
          </ThemedText>
        )}

        <ThemedText type="subtitle">Descripción de audio</ThemedText>

        {audioUrl ? (
          <View style={styles.audioTarjeta}>
            <ThemedText>
              Este reporte tiene una grabación adjunta.
            </ThemedText>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                estadoAudio.playing ? 'Pausar audio' : 'Reproducir audio'
              }
              style={styles.botonAudio}
              onPress={alternarReproduccion}
            >
              <ThemedText style={styles.textoBotonAudio}>
                {estadoAudio.playing ? '⏸ Pausar audio' : '▶ Escuchar audio'}
              </ThemedText>
            </Pressable>

            {estadoAudio.isLoaded ? (
              <ThemedText>
                {Math.floor(estadoAudio.currentTime)} s /{' '}
                {Math.floor(estadoAudio.duration)} s
              </ThemedText>
            ) : null}
          </View>
        ) : (
          <ThemedText>Este reporte no tiene audio adjunto.</ThemedText>
        )}

        <ThemedText type="subtitle">Código para seguimiento</ThemedText>
        <View style={styles.codigo}>
          <ThemedText type="title">{reporte.codigoSeguimiento}</ThemedText>

          <QRCode
            value={reporte.codigoSeguimiento}
            size={200}
            backgroundColor="#FFFFFF"
            color="#000000"
          />

          <ThemedText>
            Escaneá este QR para identificar el reclamo.
          </ThemedText>
          <ThemedText>
            Conservá también el código escrito para consultar el seguimiento.
          </ThemedText>
      </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    padding: 16,
  },
  contenido: {
    paddingBottom: 32,
    gap: 16,
  },
  tarjeta: {
    borderWidth: 1,
    borderColor: '#888888',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  fotos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  foto: {
    width: 145,
    height: 145,
    borderRadius: 10,
  },
  evento: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 12,
  },
  punto: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#27864A',
    marginTop: 5,
  },
  eventoContenido: {
    flex: 1,
    gap: 4,
  },
  audioTarjeta: {
    borderWidth: 1,
    borderColor: '#888888',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  botonAudio: {
    backgroundColor: '#246B45',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  textoBotonAudio: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  codigo: {
    borderWidth: 1,
    borderColor: '#888888',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
});
