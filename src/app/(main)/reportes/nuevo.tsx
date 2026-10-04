import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import {
  Button,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function NuevoReporteScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mostrarCamara, setMostrarCamara] = useState(false);
  const [foto, setFoto] = useState<string | null>(null);

  const cameraRef = useRef<CameraView>(null);

  const abrirCamara = async () => {
    if (!permission?.granted) {
      const resultado = await requestPermission();

      if (!resultado.granted) {
        return;
      }
    }

    setMostrarCamara(true);
  };

  const tomarFoto = async () => {
    if (!cameraRef.current) {
      return;
    }

    const resultado = await cameraRef.current.takePictureAsync();

    if (resultado?.uri) {
      setFoto(resultado.uri);
      setMostrarCamara(false);
    }
  };

  if (mostrarCamara) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        />

        <View style={styles.cameraControls}>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={tomarFoto}
          >
            <ThemedText style={styles.captureButtonText}>
              Tomar foto
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setMostrarCamara(false)}
          >
            <ThemedText style={styles.cancelButtonText}>
              Cancelar
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Nuevo reporte</ThemedText>

      <ThemedText style={styles.description}>
        Para crear un reporte necesitás adjuntar una foto del problema.
      </ThemedText>

      <Button
        title={foto ? 'Tomar otra foto' : 'Tomar foto'}
        onPress={abrirCamara}
      />

      {foto && (
        <View style={styles.previewContainer}>
          <ThemedText type="subtitle">
            Foto del problema
          </ThemedText>

          <Image
            source={{ uri: foto }}
            style={styles.preview}
            resizeMode="cover"
          />

          <ThemedText style={styles.successText}>
            ✓ Foto tomada correctamente
          </ThemedText>

          <Button
          title="Continuar"
          onPress={() => {
            // Próximamente: continuar con el formulario del reporte
          }}
        />


        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 20,
  },

  description: {
    marginTop: 8,
  },

  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },

  camera: {
    flex: 1,
  },

  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 16,
  },

  captureButton: {
    backgroundColor: '#003785',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
  },

  captureButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  cancelButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 25,
  },

  cancelButtonText: {
    color: '#003785',
    fontWeight: 'bold',
  },

  previewContainer: {
    marginTop: 8,
    gap: 12,
  },

  preview: {
    width: '100%',
    height: 250,
    borderRadius: 12,
  },

  successText: {
    fontWeight: 'bold',
  },
});