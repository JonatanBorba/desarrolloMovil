import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from "expo-haptics";
import { useRef, useState } from 'react';
import {
  Alert,
  Button,
  Image,
  Linking,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function NuevoReporteScreen() {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [mostrarAjustesMicrofono, setMostrarAjustesMicrofono] = useState(false);
  const audioPlayer = useAudioPlayer(audioUri);
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setFoto(resultado.uri);
      setMostrarCamara(false);
    }

  };
   
  const grabarAudio = async () => {
    try {
      const permiso = await requestRecordingPermissionsAsync();
      
      if (!permiso.granted) {
        setMostrarAjustesMicrofono(false);

        Alert.alert(
          'Para grabar el audio, necesitás habilitar el acceso al micrófono.',
          undefined,
          [
            {
              text: 'OK',
              onPress: () => setMostrarAjustesMicrofono(true),
            },
          ],
          
        ); 

        return;

      }
      
      setMostrarAjustesMicrofono(false);

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });


      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (error) {
      console.error('Error al iniciar la grabación:', error);
      
      Alert.alert(
       'No se pudo grabar',
       'Ocurrió un problema al iniciar la grabación. Verificá el permiso del micrófono e intentá nuevamente.'
      );

    }
  };

  const detenerAudio = async () => {
    try {
      await audioRecorder.stop();

      const uri = audioRecorder.uri;

      if (uri) {
         setAudioUri(uri);
         audioPlayer.replace({ uri });
        }
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
    });
    } catch (error) {
     console.error('Error al detener la grabación:', error);
     Alert.alert('Error', 'No se pudo detener la grabación.');
    }
  };

  const reproducirAudio = async () => {
    if (!audioUri) {
      return;
    }

    try {
      await audioPlayer.seekTo(0);
      audioPlayer.play();
    } catch (error) {
      console.error('Error al reproducir el audio:', error);
      Alert.alert('Error', 'No se pudo reproducir el audio.');
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
        
      <View style={styles.audioContainer}>
       <ThemedText type="subtitle">Audio del problema</ThemedText>

       {!recorderState.isRecording ? (
         <Button title="Grabar audio" onPress={grabarAudio} />
       ) : (
         <Button title="Detener grabación" onPress={detenerAudio} />
       )}
        {mostrarAjustesMicrofono && (
          <Button
           title="Abrir ajustes del micrófono"
           onPress={() => Linking.openSettings()}
         />
       )}
      
       {audioUri && (
         <Button title="Reproducir audio" onPress={reproducirAudio} />
       )}

       {recorderState.isRecording && (
         <ThemedText style={styles.recordingText}>
           Grabando audio...
         </ThemedText>
       )}
     </View>

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
            Foto tomada correctamente
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

  audioContainer: {
   gap: 12,
   marginTop: 8,

  },
  recordingText: {
   color: 'red',
   fontWeight: 'bold',

  },

}); 