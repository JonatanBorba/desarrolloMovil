
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  actualizarEstadoReporteOperador,
  obtenerReporteOperadorPorId,
} from '@/services/reportes';
import type { EstadoReporte, Reporte } from '@/tipos/reporte';

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

function estadosDisponibles(estado: EstadoReporte): EstadoReporte[] {
  switch (estado) {
    case 'RECIBIDO':
      return ['EN_REVISION', 'RECHAZADO'];
    case 'EN_REVISION':
      return ['RECHAZADO'];
    case 'ASIGNADO_CUADRILLA':
      return ['RESUELTO', 'EN_REVISION', 'RECHAZADO'];
    case 'RESUELTO':
    case 'RECHAZADO':
      return [];
  }
}

export default function DetalleOperadorReporteScreen() {
  const parametros = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(parametros.id)
    ? parametros.id[0]
    : parametros.id;

  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [comentario, setComentario] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    let activo = true;

    async function cargarReporte() {
      try {
        if (!id) {
          setReporte(null);
          return;
        }

        const resultado = await obtenerReporteOperadorPorId(id);

        if (activo) {
          setReporte(resultado);
        }
      } catch (error) {
        console.error('Error al cargar el reporte del operador:', error);

        if (activo) {
          setMensaje(
            error instanceof Error
              ? error.message
              : 'No se pudo cargar el reporte.',
          );
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarReporte();

    return () => {
      activo = false;
    };
  }, [id]);

  async function cambiarEstado(nuevoEstado: EstadoReporte) {
    if (!reporte || guardando || nuevoEstado === reporte.estadoActual) {
      return;
    }

    if (nuevoEstado === 'RECHAZADO' && !comentario.trim()) {
      Alert.alert(
        'Comentario obligatorio',
        'Para rechazar un reporte tenés que indicar el motivo.',
      );
      return;
    }

    setGuardando(true);
    setMensaje('');

    try {
      const actualizado = await actualizarEstadoReporteOperador(
        reporte.id,
        nuevoEstado,
        comentario,
      );

      setReporte(actualizado);
      setComentario('');
      setMensaje('Estado actualizado correctamente en el servidor.');
    } catch (error) {
      console.error('Error al actualizar el estado:', error);

      setMensaje(
        error instanceof Error
          ? error.message
          : 'No se pudo guardar el cambio. Volvé a intentarlo.',
      );
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <ThemedView style={styles.contenedor}>
        <ActivityIndicator size="large" />
        <ThemedText>Cargando reporte...</ThemedText>
      </ThemedView>
    );
  }

  if (!reporte) {
    return (
      <ThemedView style={styles.contenedor}>
        <ThemedText type="title">No se pudo cargar el reporte</ThemedText>
        <ThemedText>
          {mensaje || 'No encontramos el reporte solicitado.'}
        </ThemedText>
      </ThemedView>
    );
  }

  const disponibles = estadosDisponibles(reporte.estadoActual);

  return (
    <ThemedView style={styles.contenedor}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <ThemedText type="title">Gestionar reporte</ThemedText>

        <View style={styles.tarjeta}>
          <ThemedText type="subtitle">{reporte.tipo}</ThemedText>

          <ThemedText>
            Código de seguimiento: {reporte.codigoSeguimiento}
          </ThemedText>

          <ThemedText>ID del reporte: {reporte.id}</ThemedText>

          <ThemedText>
            Descripción: {reporte.descripcionTexto || 'Sin descripción'}
          </ThemedText>

          <ThemedText>
            Dirección: {reporte.direccionDescripcion}
          </ThemedText>

          <ThemedText>
            Estado actual: {nombreEstado(reporte.estadoActual)}
          </ThemedText>
        </View>

        <ThemedText type="subtitle">Cambiar estado</ThemedText>

        {disponibles.length > 0 ? (
          <>
            <ThemedText>
              Seleccioná una de las transiciones permitidas.
            </ThemedText>

            {disponibles.map((estado) => (
              <Pressable
                key={estado}
                accessibilityRole="button"
                disabled={guardando}
                onPress={() => cambiarEstado(estado)}
                style={[
                  styles.botonEstado,
                  guardando && styles.botonDeshabilitado,
                ]}
              >
                <ThemedText style={styles.textoEstado}>
                  {nombreEstado(estado)}
                </ThemedText>
              </Pressable>
            ))}
          </>
        ) : (
          <ThemedText>
            Este reporte no tiene más cambios de estado disponibles.
          </ThemedText>
        )}

        {disponibles.includes('RECHAZADO') ? (
          <>
            <ThemedText type="subtitle">
              Motivo o comentario
            </ThemedText>

            <TextInput
              value={comentario}
              onChangeText={setComentario}
              placeholder="Escribí el motivo del rechazo o un comentario"
              multiline
              editable={!guardando}
              style={styles.campoComentario}
            />
          </>
        ) : null}

        {guardando ? (
          <View style={styles.progreso}>
            <ActivityIndicator />
            <ThemedText>Guardando cambio en el servidor...</ThemedText>
          </View>
        ) : null}

        {mensaje ? <ThemedText>{mensaje}</ThemedText> : null}

        <ThemedText type="subtitle">Historial de estados</ThemedText>

        {reporte.cambios.length > 0 ? (
          [...reporte.cambios].reverse().map((cambio) => (
            <View key={cambio.id} style={styles.evento}>
              <ThemedText type="subtitle">
                {nombreEstado(cambio.estado)}
              </ThemedText>

              <ThemedText>
                {new Date(cambio.fecha).toLocaleString('es-AR')}
              </ThemedText>

              {cambio.comentario ? (
                <ThemedText>{cambio.comentario}</ThemedText>
              ) : null}
            </View>
          ))
        ) : (
          <ThemedText>
            Todavía no hay cambios de estado registrados.
          </ThemedText>
        )}
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
    gap: 14,
  },
  tarjeta: {
    borderWidth: 1,
    borderColor: '#888888',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  botonEstado: {
    borderWidth: 1,
    borderColor: '#246B45',
    borderRadius: 10,
    padding: 14,
  },
  botonDeshabilitado: {
    opacity: 0.5,
  },
  textoEstado: {
    fontWeight: '600',
  },
  campoComentario: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#888888',
    borderRadius: 10,
    padding: 12,
    textAlignVertical: 'top',
    color: '#222222',
  },
  progreso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  evento: {
    borderLeftWidth: 3,
    borderLeftColor: '#246B45',
    paddingLeft: 12,
    paddingVertical: 8,
    gap: 5,
  },
});
