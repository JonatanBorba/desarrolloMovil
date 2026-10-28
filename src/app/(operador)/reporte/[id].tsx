
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  guardarReporte,
  obtenerReportePorId,
} from '@/services/almacenamientoReportes';
import type { EstadoReporte, Reporte } from '@/tipos/reporte';

const ESTADOS: EstadoReporte[] = [
  'RECIBIDO',
  'EN_REVISION',
  'ASIGNADO_CUADRILLA',
  'RESUELTO',
  'RECHAZADO',
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

        const resultado = await obtenerReportePorId(id);

        if (activo) {
          setReporte(resultado);
        }
      } catch (error) {
        console.error('Error al cargar el reporte del operador:', error);

        if (activo) {
          setMensaje('No se pudo cargar el reporte.');
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

    setGuardando(true);
    setMensaje('');

    try {
      const nuevoCambio = {
        id: `cambio-${Date.now()}`,
        fecha: new Date().toISOString(),
        estado: nuevoEstado,
        comentario: comentario.trim() || null,
      };

      const reporteActualizado: Reporte = {
        ...reporte,
        estadoActual: nuevoEstado,
        cambios: [...reporte.cambios, nuevoCambio],
      };

      await guardarReporte(reporteActualizado);

      setReporte(reporteActualizado);
      setComentario('');
      setMensaje('Estado actualizado y guardado correctamente.');
    } catch (error) {
      console.error('Error al actualizar el estado:', error);
      setMensaje('No se pudo guardar el cambio. Volvé a intentarlo.');
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
        <ThemedText type="title">Reporte no encontrado</ThemedText>
        <ThemedText>
          No encontramos un reporte guardado con ese identificador.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.contenedor}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <ThemedText type="title">Gestionar reporte</ThemedText>

        <View style={styles.tarjeta}>
          <ThemedText type="subtitle">{reporte.tipo}</ThemedText>
          <ThemedText>
            Código de seguimiento: {reporte.codigoSeguimiento}
          </ThemedText>
          <ThemedText>
            ID del reporte: {reporte.id}
          </ThemedText>
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
        <ThemedText>
          Seleccioná el nuevo estado del reclamo.
        </ThemedText>

        {ESTADOS.map((estado) => {
          const seleccionado = reporte.estadoActual === estado;

          return (
            <Pressable
              key={estado}
              accessibilityRole="button"
              accessibilityState={{
                selected: seleccionado,
                disabled: guardando || seleccionado,
              }}
              disabled={guardando || seleccionado}
              onPress={() => cambiarEstado(estado)}
              style={[
                styles.botonEstado,
                seleccionado && styles.estadoActual,
                (guardando || seleccionado) && styles.botonDeshabilitado,
              ]}
            >
              <ThemedText style={styles.textoEstado}>
                {seleccionado ? '✓ Estado actual: ' : ''}
                {nombreEstado(estado)}
              </ThemedText>
            </Pressable>
          );
        })}

        <ThemedText type="subtitle">
          Comentario del cambio (opcional)
        </ThemedText>

        <TextInput
          value={comentario}
          onChangeText={setComentario}
          placeholder="Escribí un comentario para el historial"
          multiline
          editable={!guardando}
          style={styles.campoComentario}
        />

        {guardando ? (
          <View style={styles.progreso}>
            <ActivityIndicator />
            <ThemedText>Guardando cambio...</ThemedText>
          </View>
        ) : null}

        {mensaje ? (
          <ThemedText>{mensaje}</ThemedText>
        ) : null}

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
  estadoActual: {
    backgroundColor: '#246B45',
  },
  botonDeshabilitado: {
    opacity: 0.8,
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
