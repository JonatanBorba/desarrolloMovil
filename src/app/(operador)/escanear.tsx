
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { obtenerReportes } from '@/services/almacenamientoReportes';

export default function EscanearQRScreen() {
  const [permiso, solicitarPermiso] = useCameraPermissions();
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const escaneoEnCurso = useRef(false);

  async function procesarCodigo(codigoLeido: string) {
    if (escaneoEnCurso.current || procesando) {
      return;
    }

    escaneoEnCurso.current = true;
    setProcesando(true);
    setMensaje('');

    try {
      const codigo = codigoLeido.trim();

      if (!codigo) {
        setMensaje('El código QR está vacío. Intentá nuevamente.');
        return;
      }

      const reportes = await obtenerReportes();

      const reporteEncontrado = reportes.find(
        (reporte) =>
          reporte.codigoSeguimiento.trim() === codigo
      );

      if (!reporteEncontrado) {
        setMensaje(
          'No encontramos un reporte con ese código en este dispositivo.'
        );
        return;
      }

      router.replace({
        pathname: '/(operador)/reporte/[id]',
        params: { id: reporteEncontrado.id },
      });
    } catch (error) {
      console.error('Error al buscar el reporte escaneado:', error);
      setMensaje('No se pudo consultar el reporte. Intentá nuevamente.');
    } finally {
      setProcesando(false);
      escaneoEnCurso.current = false;
    }
  }

  if (!permiso) {
    return (
      <ThemedView style={styles.contenedor}>
        <ActivityIndicator size="large" />
        <ThemedText>Comprobando permiso de cámara...</ThemedText>
      </ThemedView>
    );
  }

  if (!permiso.granted) {
    return (
      <ThemedView style={styles.contenedor}>
        <ThemedText type="title">Escanear código QR</ThemedText>

        <ThemedText>
          Necesitamos permiso para utilizar la cámara y leer el código QR
          del reclamo.
        </ThemedText>

        <Pressable
          style={styles.boton}
          onPress={solicitarPermiso}
        >
          <ThemedText style={styles.textoBoton}>
            Permitir acceso a la cámara
          </ThemedText>
        </Pressable>

        <Pressable
          style={styles.botonSecundario}
          onPress={() => router.back()}
        >
          <ThemedText>Volver a la bandeja</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.contenedor}>
      <ThemedText type="title">Escanear código QR</ThemedText>

      <ThemedText>
        Ubicá el código QR del vecino dentro del recuadro para abrir su
        reclamo.
      </ThemedText>

      <View style={styles.contenedorCamara}>
        <CameraView
          style={styles.camara}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={
            procesando
              ? undefined
              : ({ data }) => {
                  void procesarCodigo(data);
                }
          }
        />

        <View pointerEvents="none" style={styles.marco}>
          <View style={styles.esquinaSuperiorIzquierda} />
          <View style={styles.esquinaSuperiorDerecha} />
          <View style={styles.esquinaInferiorIzquierda} />
          <View style={styles.esquinaInferiorDerecha} />
        </View>
      </View>

      {procesando ? (
        <View style={styles.estado}>
          <ActivityIndicator size="large" />
          <ThemedText>Buscando el reporte...</ThemedText>
        </View>
      ) : (
        <ThemedText style={styles.instruccion}>
          Apuntá la cámara hacia el código QR.
        </ThemedText>
      )}

      {mensaje ? (
        <View style={styles.mensaje}>
          <ThemedText>{mensaje}</ThemedText>

          <Pressable
            style={styles.boton}
            onPress={() => {
              setMensaje('');
              escaneoEnCurso.current = false;
            }}
          >
            <ThemedText style={styles.textoBoton}>
              Volver a escanear
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        style={styles.botonSecundario}
        onPress={() => router.back()}
      >
        <ThemedText>Volver a la bandeja</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  contenedorCamara: {
    width: '100%',
    height: 340,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camara: {
    width: '100%',
    height: '100%',
  },
  marco: {
    position: 'absolute',
    width: 230,
    height: 230,
  },
  esquinaSuperiorIzquierda: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#FFFFFF',
  },
  esquinaSuperiorDerecha: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#FFFFFF',
  },
  esquinaInferiorIzquierda: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#FFFFFF',
  },
  esquinaInferiorDerecha: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#FFFFFF',
  },
  instruccion: {
    textAlign: 'center',
  },
  estado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  mensaje: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#888888',
    borderRadius: 10,
    gap: 12,
  },
  boton: {
    backgroundColor: '#246B45',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  textoBoton: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  botonSecundario: {
    borderWidth: 1,
    borderColor: '#888888',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
});
