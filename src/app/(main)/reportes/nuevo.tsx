import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRef, useState } from 'react';
import {
  Alert,
  Button,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { guardarReporte } from '@/services/almacenamientoReportes';
import type { Reporte } from '@/tipos/reporte';

const tiposProblema = [
  'Baches',
  'Luminarias',
  'Ramas',
  'Basura',
  'Semáforos',
  'Veredas',
  'Otro',
];

export default function NuevoReporteScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const [mostrarCamara, setMostrarCamara] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarUbicacion, setMostrarUbicacion] = useState(false);

  const [foto, setFoto] = useState<string | null>(null);
  const [fotoSecundaria, setFotoSecundaria] = useState<string | null>(null);
  const [tomandoFotoSecundaria, setTomandoFotoSecundaria] = useState(false);

  const [tipoProblema, setTipoProblema] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [procesandoAudio, setProcesandoAudio] = useState(false);

  const [coordenadas, setCoordenadas] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [cargandoUbicacion, setCargandoUbicacion] = useState(false);
  const [direccion, setDireccion] = useState('');
  const [guardandoReporte, setGuardandoReporte] = useState(false);

  const cameraRef = useRef<CameraView>(null);

  const iniciarGrabacion = async () => {
    if (procesandoAudio || recorderState.isRecording) {
      return;
    }

    try {
      setProcesandoAudio(true);

      const permiso =
        await AudioModule.requestRecordingPermissionsAsync();

      if (!permiso.granted) {
        Alert.alert(
          'Permiso necesario',
          'Necesitás permitir el acceso al micrófono para grabar la descripción.'
        );
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (error) {
      console.error('Error al iniciar la grabación:', error);
      Alert.alert('Error', 'No se pudo iniciar la grabación de audio.');
    } finally {
      setProcesandoAudio(false);
    }
  };

  const detenerGrabacion = async () => {
    if (procesandoAudio || !recorderState.isRecording) {
      return;
    }

    try {
      setProcesandoAudio(true);

      await audioRecorder.stop();

      const uriGrabacion = audioRecorder.uri;

      if (uriGrabacion) {
        setAudioUri(uriGrabacion);
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } else {
        Alert.alert(
          'Error',
          'La grabación terminó, pero no se encontró el archivo de audio.'
        );
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
      });
    } catch (error) {
      console.error('Error al detener la grabación:', error);
      Alert.alert('Error', 'No se pudo finalizar la grabación.');
    } finally {
      setProcesandoAudio(false);
    }
  };

  const eliminarGrabacion = () => {
    setAudioUri(null);
  };

  const abrirCamara = async (esSegundaFoto = false) => {
    if (!permission?.granted) {
      const resultado = await requestPermission();

      if (!resultado.granted) {
        Alert.alert(
          'Permiso necesario',
          'Necesitás permitir el acceso a la cámara para sacar una foto.'
        );
        return;
      }
    }

    setTomandoFotoSecundaria(esSegundaFoto);
    setMostrarCamara(true);
  };

  const tomarFoto = async () => {
    if (!cameraRef.current) {
      return;
    }

    try {
      const resultado = await cameraRef.current.takePictureAsync();

      if (resultado?.uri) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (tomandoFotoSecundaria) {
          setFotoSecundaria(resultado.uri);
        } else {
          setFoto(resultado.uri);
        }

        setMostrarCamara(false);
      }
    } catch (error) {
      console.error('Error al tomar la foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto. Intentá nuevamente.');
    }
  };

  const cancelarCamara = () => {
    setMostrarCamara(false);
    setTomandoFotoSecundaria(false);
  };

  const elegirDeGaleria = async (esSegundaFoto = false) => {
    try {
      const permiso =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permiso.granted) {
        Alert.alert(
          'Permiso necesario',
          'Necesitás permitir el acceso a las fotos para elegir una imagen.'
        );
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!resultado.canceled && resultado.assets.length > 0) {
        const uriImagen = resultado.assets[0].uri;

        if (esSegundaFoto) {
          setFotoSecundaria(uriImagen);
        } else {
          setFoto(uriImagen);
        }
      }
    } catch (error) {
      console.error('Error al elegir la imagen:', error);
      Alert.alert(
        'Error',
        'No se pudo abrir la galería. Intentá nuevamente.'
      );
    }
  };


const obtenerUbicacion = async () => {
  try {
    setCargandoUbicacion(true);

    const permiso =
      await Location.requestForegroundPermissionsAsync();

    if (!permiso.granted) {
      Alert.alert(
        'Permiso de ubicación',
        'No se autorizó el acceso a la ubicación. Podés volver a intentarlo.'
      );
      return;
    }

    const serviciosActivos = await Location.hasServicesEnabledAsync();

    if (!serviciosActivos) {
      Alert.alert(
        'GPS desactivado',
        'Activá la ubicación del dispositivo e intentá nuevamente.'
      );
      return;
    }

    const ubicacion = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const latitud = ubicacion.coords.latitude;
    const longitud = ubicacion.coords.longitude;

    setCoordenadas({
      latitude: latitud,
      longitude: longitud,
    });

    // Intentar obtener una dirección a partir de las coordenadas.
    try {
      const direcciones = await Location.reverseGeocodeAsync({
        latitude: latitud,
        longitude: longitud,
      });

      if (direcciones.length > 0) {
        const resultado = direcciones[0];

        const partes = [
          resultado.street,
          resultado.streetNumber,
          resultado.district,
          resultado.city,
          resultado.region,
        ].filter(Boolean);

        setDireccion(
          partes.length > 0
            ? partes.join(', ')
            : 'Dirección no disponible; se guardarán las coordenadas GPS.'
        );
      } else {
        setDireccion(
          'Dirección no disponible; se guardarán las coordenadas GPS.'
        );
      }
    } catch (error) {
      console.warn('No se pudo identificar la dirección:', error);
      setDireccion(
        'Dirección no disponible; se guardarán las coordenadas GPS.'
      );
    }

    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );
  } catch (error) {
    console.error('Error al obtener la ubicación:', error);
    Alert.alert(
      'Error',
      'No se pudo obtener la ubicación. Verificá que el GPS esté activado e intentá nuevamente.'
    );
  } finally {
    setCargandoUbicacion(false);
  }
};


  const guardarNuevoReporte = async () => {
    if (guardandoReporte) {
      return;
    }

    if (recorderState.isRecording) {
      Alert.alert(
        'Grabación en curso',
        'Detené la grabación antes de guardar el reporte.'
      );
      return;
    }

    if (!foto) {
      Alert.alert(
        'Foto obligatoria',
        'Agregá una foto principal antes de guardar el reporte.'
      );
      return;
    }

    if (!tipoProblema || descripcion.trim().length < 10) {
      Alert.alert(
        'Datos incompletos',
        'Seleccioná un tipo de problema y escribí una descripción de al menos 10 caracteres.'
      );
      return;
    }

    if (!coordenadas) {
      Alert.alert(
        'Ubicación pendiente',
        'Obtené la ubicación GPS antes de guardar el reporte.'
      );
      return;
    }

    try {
      setGuardandoReporte(true);

      const ahora = new Date().toISOString();
      const identificador = `reporte-${Date.now()}`;

      const nuevoReporte: Reporte = {
        id: identificador,
        codigoSeguimiento: `RC-${Date.now().toString().slice(-8)}`,
        tipo: tipoProblema,
        descripcionTexto: descripcion.trim(),
        descripcionAudioUrlLocal: audioUri,
        descripcionAudioUrlRemota: null,
        latitud: coordenadas.latitude,
        longitud: coordenadas.longitude,
        direccionDescripcion: direccion,
        fotoPrincipalUrlLocal: foto,
        fotoPrincipalUrlRemota: null,
        fotoSecundariaUrlLocal: fotoSecundaria,
        fotoSecundariaUrlRemota: null,
        estadoActual: 'RECIBIDO',
        cambios: [
          {
            id: `cambio-${Date.now()}`,
            fecha: ahora,
            estado: 'RECIBIDO',
            comentario: 'Reporte creado por el vecino.',
          },
        ],
        esPublico: false,
        creadorId: 'vecino-local',
        zonaId: 'zona-pendiente',
        vecinosSumados: 0,
      };

      await guardarReporte(nuevoReporte);

      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } catch (error) {
        console.warn('No se pudo ejecutar la vibración:', error);
      }

      Alert.alert(
        'Reporte guardado',
        `Tu reporte se guardó en este dispositivo.\n\nCódigo de seguimiento: ${nuevoReporte.codigoSeguimiento}`,
        [
          {
            text: 'Aceptar',
            onPress: () => {
              setFoto(null);
              setFotoSecundaria(null);
              setTipoProblema('');
              setDescripcion('');
              setAudioUri(null);
              setCoordenadas(null);
              setDireccion('');
              setMostrarUbicacion(false);
              setMostrarFormulario(false);
              
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error al guardar el reporte:', error);

      Alert.alert(
        'Error al guardar',
        'No se pudo guardar el reporte. Tus datos siguen en pantalla; intentá nuevamente.'
      );
    } finally {
      setGuardandoReporte(false);
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
            onPress={cancelarCamara}
          >
            <ThemedText style={styles.cancelButtonText}>
              Cancelar
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (mostrarUbicacion) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="title">Ubicación del problema</ThemedText>

          <ThemedText style={styles.description}>
            Indicá dónde se encuentra el problema para que el municipio
            pueda localizarlo.
          </ThemedText>

          <View style={styles.previewContainer}>
            <ThemedText type="subtitle">
              Ubicación del dispositivo
            </ThemedText>

            <ThemedText>
              Presioná el botón para obtener las coordenadas GPS actuales.
            </ThemedText>

            <Button
              title={
                cargandoUbicacion
                  ? 'Obteniendo ubicación...'
                  : coordenadas
                    ? 'Actualizar ubicación'
                    : 'Obtener mi ubicación GPS'
              }
              disabled={cargandoUbicacion || guardandoReporte}
              onPress={obtenerUbicacion}
            />

            {coordenadas && (
              <View style={styles.coordinatesContainer}>
                <ThemedText style={styles.successText}>
                  ✓ Ubicación obtenida
                </ThemedText>

                <ThemedText>
                  Latitud: {coordenadas.latitude.toFixed(6)}
                </ThemedText>

                <ThemedText>
                  Longitud: {coordenadas.longitude.toFixed(6)}
                </ThemedText>

                <ThemedText type="subtitle">Dirección del problema</ThemedText>

                <TextInput
                  style={styles.descriptionInput}
                  placeholder="Ej.: calle Urquiza 450, Gualeguaychú"
                  placeholderTextColor="#777777"
                  value={direccion}
                  onChangeText={setDireccion}
                  maxLength={200}
                />

                <ThemedText style={styles.helpText}>
                  Podés corregir la dirección. Las coordenadas GPS se conservan.
                </ThemedText>
              </View>
            )}
          </View>

          <Button
            title="Volver al formulario"
            disabled={guardandoReporte}
            onPress={() => setMostrarUbicacion(false)}
          />

          <Button
            title={
              guardandoReporte ? 'Guardando reporte...' : 'Guardar reporte'
            }
            disabled={!coordenadas || guardandoReporte}
            onPress={guardarNuevoReporte}
          />
        </ScrollView>
      </ThemedView>
    );
  }

  if (mostrarFormulario) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="title">Datos del reporte</ThemedText>

          <ThemedText style={styles.description}>
            Contanos qué problema encontraste para que el municipio pueda
            identificarlo.
          </ThemedText>

          <ThemedText type="subtitle">Tipo de problema *</ThemedText>

          <View style={styles.tiposContainer}>
            {tiposProblema.map((tipo) => (
              <Pressable
                key={tipo}
                style={[
                  styles.tipoButton,
                  tipoProblema === tipo && styles.tipoButtonSelected,
                ]}
                onPress={() => setTipoProblema(tipo)}
              >
                <ThemedText
                  style={[
                    styles.tipoText,
                    tipoProblema === tipo && styles.tipoTextSelected,
                  ]}
                >
                  {tipo}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          <ThemedText type="subtitle">Descripción *</ThemedText>

          <TextInput
            style={styles.descriptionInput}
            placeholder="Describí el problema y dónde se encuentra..."
            placeholderTextColor="#777777"
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            maxLength={1000}
            textAlignVertical="top"
          />

          <ThemedText style={styles.counterText}>
            {descripcion.length}/1000 caracteres
          </ThemedText>

          <View style={styles.audioContainer}>
            <ThemedText type="subtitle">
              Descripción por audio (opcional)
            </ThemedText>

            <ThemedText>
              Podés grabar una explicación del problema usando el micrófono.
            </ThemedText>

            {recorderState.isRecording ? (
              <>
                <ThemedText style={styles.recordingText}>
                  ● Grabando audio...
                </ThemedText>
                <Button
                  title="Detener grabación"
                  disabled={procesandoAudio}
                  onPress={detenerGrabacion}
                />
              </>
            ) : (
              <Button
                title={
                  audioUri ? 'Grabar audio nuevamente' : 'Grabar audio'
                }
                disabled={procesandoAudio || guardandoReporte}
                onPress={iniciarGrabacion}
              />
            )}

            {audioUri && !recorderState.isRecording && (
              <>
                <ThemedText style={styles.successText}>
                  ✓ Audio grabado y listo para adjuntar
                </ThemedText>
                <Button
                  title="Eliminar audio"
                  disabled={procesandoAudio || guardandoReporte}
                  onPress={eliminarGrabacion}
                />
              </>
            )}
          </View>

          <ThemedText style={styles.helpText}>
            Los campos marcados con * son obligatorios. El audio es opcional.
          </ThemedText>

          <Button
            title="Volver a las fotos"
            onPress={() => setMostrarFormulario(false)}
          />

          <Button
            title="Continuar a la ubicación"
            disabled={
              !tipoProblema ||
              descripcion.trim().length < 10 ||
              recorderState.isRecording ||
              procesandoAudio
            }
            onPress={() => {
              if (descripcion.trim().length < 10) {
                Alert.alert(
                  'Descripción incompleta',
                  'Describí el problema con al menos 10 caracteres.'
                );
                return;
              }

              setMostrarUbicacion(true);
            }}
          />
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="title">Nuevo reporte</ThemedText>

        <ThemedText style={styles.description}>
          Para crear un reporte necesitás adjuntar una foto del problema.
        </ThemedText>

        <View style={styles.previewContainer}>
          <ThemedText type="subtitle">
            Foto principal (obligatoria)
          </ThemedText>

          {foto ? (
            <>
              <Image
                source={{ uri: foto }}
                style={styles.preview}
                resizeMode="cover"
              />

              <ThemedText style={styles.successText}>
                ✓ Foto principal agregada correctamente
              </ThemedText>
            </>
          ) : (
            <ThemedText>
              Todavía no agregaste la foto principal.
            </ThemedText>
          )}

          <Button
            title={foto ? 'Tomar otra foto principal' : 'Tomar foto'}
            onPress={() => abrirCamara(false)}
          />

          <Button
            title={
              foto
                ? 'Elegir otra imagen principal'
                : 'Elegir imagen de la galería'
            }
            onPress={() => elegirDeGaleria(false)}
          />
        </View>

        {foto && (
          <View style={styles.previewContainer}>
            <ThemedText type="subtitle">
              Segunda foto (opcional)
            </ThemedText>

            {fotoSecundaria ? (
              <>
                <Image
                  source={{ uri: fotoSecundaria }}
                  style={styles.preview}
                  resizeMode="cover"
                />

                <ThemedText style={styles.successText}>
                  ✓ Segunda foto agregada correctamente
                </ThemedText>
              </>
            ) : (
              <ThemedText>
                Podés agregar otra foto desde un ángulo diferente.
              </ThemedText>
            )}

            <Button
              title={
                fotoSecundaria
                  ? 'Tomar otra segunda foto'
                  : 'Agregar segunda foto (opcional)'
              }
              onPress={() => abrirCamara(true)}
            />

            <Button
              title={
                fotoSecundaria
                  ? 'Elegir otra segunda imagen'
                  : 'Elegir segunda imagen de la galería'
              }
              onPress={() => elegirDeGaleria(true)}
            />
          </View>
        )}

        {foto && (
          <View style={styles.continueContainer}>
            <Button
              title="Continuar al formulario"
              onPress={() => setMostrarFormulario(true)}
            />
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },

  scrollContent: {
    gap: 20,
    paddingBottom: 32,
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

  recordingText: {
    color: '#D32F2F',
    fontWeight: 'bold',
  },

  audioContainer: {
    marginTop: 8,
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#777777',
    borderRadius: 10,
  },

  coordinatesContainer: {
    marginTop: 8,
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#777777',
    borderRadius: 10,
  },

  continueContainer: {
    marginTop: 8,
  },

  tiposContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  tipoButton: {
    borderWidth: 1,
    borderColor: '#777777',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  tipoButtonSelected: {
    backgroundColor: '#003785',
    borderColor: '#003785',
  },

  tipoText: {
    color: '#333333',
  },

  tipoTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  descriptionInput: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: '#777777',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#222222',
  },

  counterText: {
    fontSize: 12,
    textAlign: 'right',
  },

  helpText: {
    fontSize: 13,
  },
});