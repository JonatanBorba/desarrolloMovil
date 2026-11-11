
import {
  eliminarBorrador,
  guardarBorrador,
  obtenerBorrador,
} from "@/services/borradores";

import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Directory, File, Paths } from "expo-file-system";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  guardarReporte,
  obtenerReportePorId,
} from "@/services/almacenamientoReportes";
import { WebView } from "react-native-webview";

import { notificarReporteEnviado } from "@/services/notificaciones";
import {
  enviarReporte,
  obtenerReportesCercanos,
  obtenerTiposDeReporte,
} from "@/services/reportes";
import type { Reporte } from "@/tipos/reporte";


function obtenerDirectorioTemporal() {
  return new Directory(Paths.cache, "reportes-temporales");
}


function eliminarArchivoTemporal(uri: string | null) {
  if (!uri) return;

  try {
    const directorio = obtenerDirectorioTemporal();
    const prefijo = directorio.uri.endsWith("/")
      ? directorio.uri
      : `${directorio.uri}/`;

    if (!uri.startsWith(prefijo)) return;

    const archivo = new File(uri);

    if (archivo.exists) {
      archivo.delete();
    }
  } catch (error) {
    console.warn("No se pudo eliminar el archivo temporal:", error);
  }
}

async function guardarArchivoLocal(
  uri: string | null,
  nombreBase: string,
  extensionPredeterminada: string,
): Promise<string | null> {
  if (!uri) return null;

  const directorio = new Directory(Paths.document, "reportes");

  if (!directorio.exists) {
    directorio.create({
      intermediates: true,
      idempotent: true,
    });
  }

  const uriSinParametros = uri.split("?")[0].split("#")[0];
  const extension =
    uriSinParametros.match(/\.([a-zA-Z0-9]+)$/)?.[1] ?? extensionPredeterminada;

  const archivoOriginal = new File(uri);
  const archivoDestino = new File(
    directorio,
    `${nombreBase}-${Date.now()}.${extension}`,
  );

  archivoOriginal.copy(archivoDestino);

  return archivoDestino.uri;
}

const HTML_MAPA_UBICACION = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />
  <style>
    html, body, #mapa {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <div id="mapa"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var limitesCiudad = L.latLngBounds(
  [-33.055, -58.565],
  [-32.975, -58.475]
);

var mapa = L.map("mapa", {
  maxBounds: limitesCiudad,
  maxBoundsViscosity: 1.0
}).setView([-33.0094, -58.518], 15);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(mapa);

    var marcador = null;

    function actualizarMarcador(lat, lon, centrar) {
      var punto = [lat, lon];

      if (!marcador) {
        marcador = L.marker(punto, { draggable: true }).addTo(mapa);

        marcador.on("dragend", function(evento) {
          var posicion = evento.target.getLatLng();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            latitude: posicion.lat,
            longitude: posicion.lng
          }));
        });
      } else {
        marcador.setLatLng(punto);
      }

      if (centrar) {
        mapa.setView(punto, 17);
      }
    }

    window.actualizarMarcador = actualizarMarcador;

    mapa.on("click", function(evento) {
      var lat = evento.latlng.lat;
      var lon = evento.latlng.lng;

      actualizarMarcador(lat, lon, false);

      window.ReactNativeWebView.postMessage(JSON.stringify({
        latitude: lat,
        longitude: lon
      }));
    });
  </script>
</body>
</html>
`;

const LIMITES_GUALEGUAYCHU = {
  norte: -32.975,
  sur: -33.055,
  este: -58.475,
  oeste: -58.565,
};

function estaDentroDeGualeguaychu(
  latitud: number,
  longitud: number,
): boolean {
  return (
    latitud >= LIMITES_GUALEGUAYCHU.sur &&
    latitud <= LIMITES_GUALEGUAYCHU.norte &&
    longitud >= LIMITES_GUALEGUAYCHU.oeste &&
    longitud <= LIMITES_GUALEGUAYCHU.este
  );
}

export default function NuevoReporteScreen() {
  const parametros = useLocalSearchParams<{ id?: string | string[] }>();
  const idParametro = Array.isArray(parametros.id)
    ? parametros.id[0]
    : parametros.id;

  const esEdicion = Boolean(idParametro);

  const colorTexto = useColorScheme() === "dark" ? "#FFFFFF" : "#222222";

  const [permission, requestPermission] = useCameraPermissions();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  const [reporteOriginal, setReporteOriginal] = useState<Reporte | null>(null);
  const [cargandoReporte, setCargandoReporte] = useState(esEdicion);
  const [borradorCargado, setBorradorCargado] = useState(false);
  const [edicionPermitida, setEdicionPermitida] = useState(false);

  const [mostrarCamara, setMostrarCamara] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [mostrarUbicacion, setMostrarUbicacion] = useState(false);

  const [foto, setFoto] = useState<string | null>(null);
  const [fotoSecundaria, setFotoSecundaria] = useState<string | null>(null);
  const [tomandoFotoSecundaria, setTomandoFotoSecundaria] = useState(false);

  const [tipoProblema, setTipoProblema] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [procesandoAudio, setProcesandoAudio] = useState(false);
  const [tiposProblema, setTiposProblema] = useState<string[]>([]);

  useEffect(() => {
    let cancelado = false;
    obtenerTiposDeReporte()
      .then((tipos) => {
        if (!cancelado) setTiposProblema(tipos.map((t) => t.nombre));
      })
      .catch((e) => console.warn("No se pudo cargar el catálogo:", e));
    return () => {
      cancelado = true;
    };
  }, []);

  const [coordenadas, setCoordenadas] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [cargandoUbicacion, setCargandoUbicacion] = useState(false);
  const [direccion, setDireccion] = useState("");
  const [guardandoReporte, setGuardandoReporte] = useState(false);

  const cameraRef = useRef<CameraView>(null);

  const mapaUbicacionRef = useRef<WebView>(null);
const [mapaUbicacionListo, setMapaUbicacionListo] = useState(false);

useEffect(() => {
  if (!mapaUbicacionListo || !coordenadas) return;

  mapaUbicacionRef.current?.injectJavaScript(`
    window.actualizarMarcador(
      ${coordenadas.latitude},
      ${coordenadas.longitude},
      true
    );
    true;
  `);
}, [coordenadas, mapaUbicacionListo]);

  useEffect(() => {
    if (!idParametro) {
      setCargandoReporte(false);
      return;
    }

    let activo = true;

    const cargarReporteParaEditar = async () => {
      try {
        const guardado = await obtenerReportePorId(idParametro);

        if (!activo) return;

        if (!guardado) {
          Alert.alert(
            "Reporte no encontrado",
            "No se encontró el reporte que intentás editar.",
            [{ text: "Aceptar", onPress: () => router.back() }],
          );
          return;
        }

        setReporteOriginal(guardado);

        if (guardado.estadoActual !== "RECIBIDO") {
          setEdicionPermitida(false);
          return;
        }

        setEdicionPermitida(true);
        setFoto(
          guardado.fotoPrincipalUrlLocal ?? guardado.fotoPrincipalUrlRemota,
        );
        setFotoSecundaria(
          guardado.fotoSecundariaUrlLocal ?? guardado.fotoSecundariaUrlRemota,
        );
        setAudioUri(
          guardado.descripcionAudioUrlLocal ??
            guardado.descripcionAudioUrlRemota,
        );
        setDescripcion(guardado.descripcionTexto ?? "");
        setTipoProblema(guardado.tipo);
      } catch (error) {
        console.error("Error al cargar el reporte para editar:", error);

        if (activo) {
          Alert.alert("Error", "No se pudo cargar el reporte para editar.", [
            { text: "Aceptar", onPress: () => router.back() },
          ]);
        }
      } finally {
        if (activo) {
          setCargandoReporte(false);
        }
      }
    };

    void cargarReporteParaEditar();

    return () => {
      activo = false;
    };
  }, [idParametro]);

  useEffect(() => {
  if (esEdicion) {
    setBorradorCargado(true);
    return;
  }

  let activo = true;

  const cargarBorradorGuardado = async () => {
    try {
      const borrador = await obtenerBorrador();

      if (!activo || !borrador) return;

      setTipoProblema(borrador.tipoProblema);
      setDescripcion(borrador.descripcion);
      setFoto(borrador.foto);
      setFotoSecundaria(borrador.fotoSecundaria);
      setAudioUri(borrador.audioUri);
      setCoordenadas(borrador.coordenadas);
      setDireccion(borrador.direccion);

      if (
        borrador.tipoProblema ||
        borrador.descripcion ||
        borrador.foto ||
        borrador.coordenadas
      ) {
        Alert.alert(
          "Borrador recuperado",
          "Se recuperaron los datos del reporte que estabas preparando.",
        );
      }
    } catch (error) {
      console.warn("No se pudo recuperar el borrador:", error);
    } finally {
      if (activo) setBorradorCargado(true);
    }
  };

  void cargarBorradorGuardado();

  return () => {
    activo = false;
  };
}, [esEdicion]);

useEffect(() => {
  if (esEdicion || cargandoReporte || !borradorCargado) return;

  const borrador = {
    tipoProblema,
    descripcion,
    foto,
    fotoSecundaria,
    audioUri,
    coordenadas,
    direccion,
  };

  const hayDatos =
    Boolean(tipoProblema) ||
    Boolean(descripcion) ||
    Boolean(foto) ||
    Boolean(fotoSecundaria) ||
    Boolean(audioUri) ||
    Boolean(coordenadas) ||
    Boolean(direccion);

  const guardar = async () => {
    try {
      if (hayDatos) {
        await guardarBorrador(borrador);
      } else {
        await eliminarBorrador();
      }
    } catch (error) {
      console.warn("No se pudo guardar el borrador:", error);
    }
  };

  void guardar();
}, [
  esEdicion,
  cargandoReporte,
  borradorCargado,
  tipoProblema,
  descripcion,
  foto,
  fotoSecundaria,
  audioUri,
  coordenadas,
  direccion,
]);

  const iniciarGrabacion = async () => {
    if (procesandoAudio || recorderState.isRecording) return;

    try {
      setProcesandoAudio(true);

      const permiso = await AudioModule.requestRecordingPermissionsAsync();

      if (!permiso.granted) {
        Alert.alert(
          "Permiso necesario",
          "Necesitás permitir el acceso al micrófono para grabar la descripción.",
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
      console.error("Error al iniciar la grabación:", error);

      Alert.alert("Error", "No se pudo iniciar la grabación de audio.");
    } finally {
      setProcesandoAudio(false);
    }
  };


  const detenerGrabacion = async () => {
    if (procesandoAudio || !recorderState.isRecording) return;

    try {
      setProcesandoAudio(true);

      await audioRecorder.stop();

      const uriGrabacion = audioRecorder.uri;

      if (uriGrabacion) {
        const nuevoAudioLocal = await guardarArchivoLocal(
          uriGrabacion,
          "descripcion-audio",
          "m4a",
        );

        if (nuevoAudioLocal) {
          eliminarArchivoTemporal(audioUri);
          setAudioUri(nuevoAudioLocal);

          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
        }
      } else {
        Alert.alert(
          "Error",
          "La grabación terminó, pero no se encontró el archivo de audio.",
        );
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
      });
    } catch (error) {
      console.error("Error al detener la grabación:", error);
      Alert.alert("Error", "No se pudo finalizar la grabación.");
    } finally {
      setProcesandoAudio(false);
    }
  };

  const eliminarGrabacion = () => {
    eliminarArchivoTemporal(audioUri);
    setAudioUri(null);
  };

  const abrirCamara = async (esSegundaFoto = false) => {
    if (!permission?.granted) {
      const resultado = await requestPermission();

      if (!resultado.granted) {
        Alert.alert(
          "Permiso necesario",
          "Necesitás permitir el acceso a la cámara para sacar una foto.",
        );
        return;
      }
    }

    setTomandoFotoSecundaria(esSegundaFoto);
    setMostrarCamara(true);
  };

    const tomarFoto = async () => {
    if (!cameraRef.current) return;

    try {
      const resultado = await cameraRef.current.takePictureAsync();

      if (resultado?.uri) {
        const nuevaFotoLocal = await guardarArchivoLocal(
          resultado.uri,
          tomandoFotoSecundaria ? "segunda-foto" : "foto-principal",
          "jpg",
        );

        if (!nuevaFotoLocal) {
          Alert.alert("Error", "No se pudo guardar la foto.");
          return;
        }

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (tomandoFotoSecundaria) {
          eliminarArchivoTemporal(fotoSecundaria);
          setFotoSecundaria(nuevaFotoLocal);
        } else {
          eliminarArchivoTemporal(foto);
          setFoto(nuevaFotoLocal);
        }

        setMostrarCamara(false);
      }
    } catch (error) {
      console.error("Error al tomar la foto:", error);
      Alert.alert("Error", "No se pudo tomar la foto. Intentá nuevamente.");
    }
  };
  const cancelarCamara = () => {
    setMostrarCamara(false);
    setTomandoFotoSecundaria(false);
  };

    const elegirDeGaleria = async (esSegundaFoto = false) => {
    try {
      const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permiso.granted) {
        Alert.alert(
          "Permiso necesario",
          "Necesitás permitir el acceso a las fotos para elegir una imagen.",
        );
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });

      if (!resultado.canceled && resultado.assets.length > 0) {
        const uriImagen = resultado.assets[0].uri;

        const nuevaFotoLocal = await guardarArchivoLocal(
          uriImagen,
          esSegundaFoto ? "segunda-foto" : "foto-principal",
          "jpg",
        );

        if (!nuevaFotoLocal) {
          Alert.alert("Error", "No se pudo guardar la imagen seleccionada.");
          return;
        }

        if (esSegundaFoto) {
          eliminarArchivoTemporal(fotoSecundaria);
          setFotoSecundaria(nuevaFotoLocal);
        } else {
          eliminarArchivoTemporal(foto);
          setFoto(nuevaFotoLocal);
        }
      }
    } catch (error) {
      console.error("Error al elegir la imagen:", error);
      Alert.alert("Error", "No se pudo abrir la galería. Intentá nuevamente.");
    }
  };

  const obtenerUbicacion = async () => {
    try {
      setCargandoUbicacion(true);

      const permiso = await Location.requestForegroundPermissionsAsync();

      if (!permiso.granted) {
        Alert.alert(
          "Permiso de ubicación",
          "No se autorizó el acceso a la ubicación. Podés seleccionar manualmente el lugar en el mapa.",
        );
        return;
      }

      const serviciosActivos = await Location.hasServicesEnabledAsync();

      if (!serviciosActivos) {
        Alert.alert(
          "GPS desactivado",
          "Activá la ubicación del dispositivo e intentá nuevamente.",
        );
        return;
      }



      const ubicacion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const latitud = ubicacion.coords.latitude;
      const longitud = ubicacion.coords.longitude;

      if (!estaDentroDeGualeguaychu(latitud, longitud)) {
        Alert.alert(
          "Ubicación fuera de Gualeguaychú",
          "El GPS informó una ubicación fuera del área habilitada. Podés seleccionar manualmente el lugar correcto en el mapa.",
        );
        return;
      }

      setCoordenadas({
        latitude: latitud,
        longitude: longitud,
      });

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
              ? partes.join(", ")
              : "Dirección no disponible; se guardarán las coordenadas GPS.",
          );
        } else {
          setDireccion(
            "Dirección no disponible; se guardarán las coordenadas GPS.",
          );
        }
      } catch (error) {
        console.warn("No se pudo identificar la dirección:", error);
        setDireccion(
          "Dirección no disponible; se guardarán las coordenadas GPS.",
        );
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      try {
        const cercanos = await obtenerReportesCercanos(
          ubicacion.coords.latitude,
          ubicacion.coords.longitude,
          50,
        );

        if (cercanos.length > 0) {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Warning,
          );

          const primero = cercanos[0];

          Alert.alert(
            "¿Es el mismo problema?",
            `Ya ${cercanos.length === 1 ? "hay un reporte" : `hay ${cercanos.length} reportes`} a menos de 50 m: ${primero.tipo} en ${primero.direccionDescripcion}. Si es el mismo, podés sumarte en vez de crear otro.`,
            [
              {
                text: "Ver ese reporte",
                onPress: () =>
                  router.push({
                    pathname: "/reportes/[id]",
                    params: { id: primero.id },
                  }),
              },
              { text: "Es otro problema", style: "cancel" },
            ],
          );
        }
      } catch (e) {
        console.warn("No se pudieron consultar reportes cercanos:", e);
      }
    } catch (error) {
      console.error("Error al obtener la ubicación:", error);

      Alert.alert(
        "Error",
        "No se pudo obtener la ubicación. Verificá que el GPS esté activado e intentá nuevamente.",
      );
    } finally {
      setCargandoUbicacion(false);
    }
  };

  const guardarNuevoReporte = async () => {
    if (guardandoReporte) return;

    if (recorderState.isRecording) {
      Alert.alert(
        "Grabación en curso",
        "Detené la grabación antes de guardar el reporte.",
      );
      return;
    }

    if (!foto) {
      Alert.alert(
        "Foto obligatoria",
        "Agregá una foto principal antes de guardar el reporte.",
      );
      return;
    }

    if (!tipoProblema || descripcion.trim().length < 10) {
      Alert.alert(
        "Datos incompletos",
        "Seleccioná un tipo de problema y escribí una descripción de al menos 10 caracteres.",
      );
      return;
    }

    if (!coordenadas) {
      Alert.alert(
        "Ubicación pendiente",
        "Seleccioná una ubicación en el mapa o utilizá el GPS antes de guardar el reporte.",
      );
      return;
    }

    try {
      setGuardandoReporte(true);

      const ahora = new Date().toISOString();
      const identificador = `rep-${Date.now()}`;

      const fotoPrincipalLocal = foto;
      const fotoSecundariaLocal = fotoSecundaria;
      const audioLocal = audioUri;

      const nuevoReporte: Reporte = {
        id: identificador,
        codigoSeguimiento: `RC-${Date.now().toString().slice(-8)}`,
        tipo: tipoProblema,
        descripcionTexto: descripcion.trim(),
        descripcionAudioUrlLocal: audioLocal,
        descripcionAudioUrlRemota: null,
        latitud: coordenadas.latitude,
        longitud: coordenadas.longitude,
        direccionDescripcion: direccion || "Dirección pendiente de identificar",
        fotoPrincipalUrlLocal: fotoPrincipalLocal,
        fotoPrincipalUrlRemota: null,
        fotoSecundariaUrlLocal: fotoSecundariaLocal,
        fotoSecundariaUrlRemota: null,
        estadoActual: "RECIBIDO",
        cambios: [
          {
            id: `cambio-${Date.now()}`,
            fecha: ahora,
            estado: "RECIBIDO",
            comentario: "Reporte creado por el vecino.",
          },
        ],
        esPublico: true,
        creadorId: "vecino-local",
        zonaId: "zona-pendiente",
        vecinosSumados: 0,
        yaMeSumé: false,
        fotoArregloUrlLocal: null,
        fotoArregloUrlRemota: null,
        sincronizado: false,
        duplicadoDe: null,
      };

      const resultado = await enviarReporte(nuevoReporte);

      try {
        await eliminarBorrador();
      } catch (error) {
        console.warn("No se pudo eliminar el borrador:", error);
      }


      eliminarArchivoTemporal(foto);
      eliminarArchivoTemporal(fotoSecundaria);
      eliminarArchivoTemporal(audioUri);

      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      } catch (error) {
        console.warn("No se pudo ejecutar la vibración:", error);
      }

      try {
        await notificarReporteEnviado(tipoProblema);
      } catch (error) {
        console.warn("No se pudo mostrar la notificación:", error);
      }

      Alert.alert(
        "Reporte guardado",
        resultado.sincronizado
          ? `Tu reporte ya está en el sistema municipal.\n\nCódigo de seguimiento: ${resultado.codigoSeguimiento}`
          : `Tu reporte quedó guardado en el teléfono y se subirá solo cuando haya conexión.\n\nCódigo de seguimiento: ${resultado.codigoSeguimiento}`,
        [
          {
            text: "Aceptar",
            onPress: () => {
              setFoto(null);
              setFotoSecundaria(null);
              setTipoProblema("");
              setDescripcion("");
              setAudioUri(null);
              setCoordenadas(null);
              setDireccion("");
              setMostrarUbicacion(false);
              setMostrarFormulario(false);
            },
          },
        ],
      );
    } catch (error) {
      console.error("Error al guardar el reporte:", error);

      Alert.alert(
        "Error al guardar",
        "No se pudo guardar el reporte. Tus datos siguen en pantalla; intentá nuevamente.",
      );
    } finally {
      setGuardandoReporte(false);
    }
  };

  const guardarEdicion = async () => {
    if (guardandoReporte || !reporteOriginal || !idParametro) return;

    if (recorderState.isRecording) {
      Alert.alert(
        "Grabación en curso",
        "Detené la grabación antes de guardar los cambios.",
      );
      return;
    }

    if (!foto) {
      Alert.alert(
        "Foto obligatoria",
        "El reporte debe conservar una foto principal.",
      );
      return;
    }

    if (descripcion.trim().length < 10) {
      Alert.alert(
        "Descripción incompleta",
        "Escribí una descripción de al menos 10 caracteres.",
      );
      return;
    }

    try {
      setGuardandoReporte(true);

      // Se vuelve a consultar el estado para evitar editar un reporte
      // que haya sido tomado por un operador mientras esta pantalla estaba abierta.
      const reporteActual = await obtenerReportePorId(idParametro);

      if (!reporteActual || reporteActual.estadoActual !== "RECIBIDO") {
        setEdicionPermitida(false);

        Alert.alert(
          "Edición no disponible",
          "El reporte ya no está en estado Recibido y no puede modificarse.",
        );
        return;
      }

      const fotoPrincipalSinCambios =
        foto === reporteOriginal.fotoPrincipalUrlLocal ||
        foto === reporteOriginal.fotoPrincipalUrlRemota;

      const fotoSecundariaSinCambios =
        fotoSecundaria === reporteOriginal.fotoSecundariaUrlLocal ||
        fotoSecundaria === reporteOriginal.fotoSecundariaUrlRemota;

      const audioSinCambios =
        audioUri === reporteOriginal.descripcionAudioUrlLocal ||
        audioUri === reporteOriginal.descripcionAudioUrlRemota;

      const fotoPrincipalLocal = fotoPrincipalSinCambios
        ? reporteOriginal.fotoPrincipalUrlLocal
        : await guardarArchivoLocal(
            foto,
            `${reporteOriginal.id}-principal`,
            "jpg",
          );

      const fotoPrincipalRemota = fotoPrincipalSinCambios
        ? reporteOriginal.fotoPrincipalUrlRemota
        : null;

      const fotoSecundariaLocal = fotoSecundariaSinCambios
        ? reporteOriginal.fotoSecundariaUrlLocal
        : await guardarArchivoLocal(
            fotoSecundaria,
            `${reporteOriginal.id}-secundaria`,
            "jpg",
          );

      const fotoSecundariaRemota = fotoSecundariaSinCambios
        ? reporteOriginal.fotoSecundariaUrlRemota
        : null;

      const audioLocal = audioSinCambios
        ? reporteOriginal.descripcionAudioUrlLocal
        : await guardarArchivoLocal(
            audioUri,
            `${reporteOriginal.id}-audio`,
            "m4a",
          );

      const audioRemoto = audioSinCambios
        ? reporteOriginal.descripcionAudioUrlRemota
        : null;

      const reporteActualizado: Reporte = {
        ...reporteActual,
        descripcionTexto: descripcion.trim(),
        fotoPrincipalUrlLocal: fotoPrincipalLocal,
        fotoPrincipalUrlRemota: fotoPrincipalRemota,
        fotoSecundariaUrlLocal: fotoSecundariaLocal,
        fotoSecundariaUrlRemota: fotoSecundariaRemota,
        descripcionAudioUrlLocal: audioLocal,
        descripcionAudioUrlRemota: audioRemoto,
      };

      await guardarReporte(reporteActualizado);

      eliminarArchivoTemporal(foto);
      eliminarArchivoTemporal(fotoSecundaria);
      eliminarArchivoTemporal(audioUri);

      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      } catch (error) {
        console.warn("No se pudo ejecutar la vibración:", error);
      }

      Alert.alert(
        "Cambios guardados",
        "El reporte se actualizó correctamente.",
        [
          {
            text: "Aceptar",
            onPress: () => {
              router.replace({
                pathname: "/(main)/reportes/[id]",
                params: { id: reporteOriginal.id },
              });
            },
          },
        ],
      );
    } catch (error) {
      console.error("Error al actualizar el reporte:", error);

      Alert.alert(
        "Error al guardar",
        "No se pudieron guardar los cambios. Los datos originales del reporte se conservaron.",
      );
    } finally {
      setGuardandoReporte(false);
    }
  };

  if (cargandoReporte) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: "Editar reporte" }} />
        <ActivityIndicator size="large" />
        <ThemedText>Cargando reporte...</ThemedText>
      </ThemedView>
    );
  }

  if (esEdicion && (!reporteOriginal || !edicionPermitida)) {
    return (
      <ThemedView style={styles.container}>
        <Stack.Screen options={{ title: "Editar reporte" }} />

        <ThemedText type="title">Edición no disponible</ThemedText>

        <ThemedText>
          {reporteOriginal
            ? "Este reporte ya no está en estado Recibido. Podés consultar sus datos, pero no modificarlos."
            : "No se encontró el reporte solicitado."}
        </ThemedText>

        <Button title="Volver" onPress={() => router.back()} />
      </ThemedView>
    );
  }

  if (mostrarCamara) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />

        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.captureButton} onPress={tomarFoto}>
            <ThemedText style={styles.captureButtonText}>Tomar foto</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={cancelarCamara}
          >
            <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (mostrarUbicacion && !esEdicion) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="title">Ubicación del problema</ThemedText>

          <ThemedText style={styles.description}>
            Indicá dónde se encuentra el problema para que el municipio pueda
            localizarlo.
          </ThemedText>

          <View style={styles.previewContainer}>
            <ThemedText type="subtitle">Elegí la ubicación en el mapa</ThemedText>

<ThemedText>
  Tocá el lugar donde está el problema. También podés arrastrar el marcador
  para corregir su posición.
</ThemedText>

<View style={styles.mapaUbicacionContainer}>
  <WebView
    ref={mapaUbicacionRef}
    source={{ html: HTML_MAPA_UBICACION }}
    originWhitelist={["*"]}
    javaScriptEnabled
    domStorageEnabled
    onLoadEnd={() => setMapaUbicacionListo(true)}
    onMessage={async (evento) => {
      try {
        const punto = JSON.parse(evento.nativeEvent.data);

        if (
  typeof punto.latitude !== "number" ||
  typeof punto.longitude !== "number"
) {
  return;
}

  if (
    !estaDentroDeGualeguaychu(
      punto.latitude,
      punto.longitude,
    )
  ) {
    Alert.alert(
      "Ubicación fuera del área habilitada",
      "Seleccioná un punto dentro de Gualeguaychú.",
    );
    return;
  }

  setCoordenadas({
          latitude: punto.latitude,
          longitude: punto.longitude,
        });
        setDireccion("");

        try {
          const cercanos = await obtenerReportesCercanos(
            punto.latitude,
            punto.longitude,
            50,
          );

          if (cercanos.length > 0) {
            const primero = cercanos[0];

            Alert.alert(
              "¿Es el mismo problema?",
              `Ya ${
                cercanos.length === 1 ? "hay un reporte" : `hay ${cercanos.length} reportes`
              } a menos de 50 m: ${primero.tipo} en ${primero.direccionDescripcion}. Si es el mismo, podés sumarte en vez de crear otro.`,
              [
                {
                  text: "Ver ese reporte",
                  onPress: () =>
                    router.push({
                      pathname: "/reportes/[id]",
                      params: { id: primero.id },
                    }),
                },
                { text: "Es otro problema", style: "cancel" },
              ],
            );
          }
        } catch (error) {
          console.warn("No se pudieron consultar reportes cercanos:", error);
        }
      } catch (error) {
        console.warn("No se pudo interpretar la ubicación del mapa:", error);
      }
    }}
    style={styles.mapaUbicacion}
  />
</View>

<ThemedText type="subtitle">O usar la ubicación GPS</ThemedText>

<ThemedText>
  Si preferís, podés obtener automáticamente la ubicación actual del dispositivo.
</ThemedText>

            <Button
              title={
                cargandoUbicacion
                  ? "Obteniendo ubicación..."
                  : coordenadas
                    ? "Actualizar ubicación"
                    : "Obtener mi ubicación GPS"
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
                  style= {[styles.descriptionInput, { color: colorTexto }]}
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
              guardandoReporte ? "Guardando reporte..." : "Guardar reporte"
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
        <Stack.Screen
          options={{ title: esEdicion ? "Editar reporte" : "Nuevo reporte" }}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ThemedText type="title">
            {esEdicion ? "Editar descripción" : "Datos del reporte"}
          </ThemedText>

          <ThemedText style={styles.description}>
            {esEdicion
              ? "Podés corregir la descripción del problema."
              : "Contanos qué problema encontraste para que el municipio pueda identificarlo."}
          </ThemedText>

          {!esEdicion && (
            <>
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
            </>
          )}

          <ThemedText type="subtitle">Descripción *</ThemedText>

          <TextInput
            style= {[styles.descriptionInput, { color: colorTexto }]}
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

            {audioUri && !recorderState.isRecording && (
              <ThemedText style={styles.successText}>
                ✓ Hay un audio adjunto
              </ThemedText>
            )}

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
                title={audioUri ? "Grabar audio nuevamente" : "Grabar audio"}
                disabled={procesandoAudio || guardandoReporte}
                onPress={iniciarGrabacion}
              />
            )}

            {audioUri && !recorderState.isRecording && (
              <Button
                title="Eliminar audio"
                disabled={procesandoAudio || guardandoReporte}
                onPress={eliminarGrabacion}
              />
            )}
          </View>

          <ThemedText style={styles.helpText}>
            Los campos marcados con * son obligatorios. El audio es opcional.
          </ThemedText>

          <Button
            title={esEdicion ? "Volver a las fotos" : "Volver a las fotos"}
            onPress={() => setMostrarFormulario(false)}
          />

          <Button
            title={
              esEdicion
                ? guardandoReporte
                  ? "Guardando cambios..."
                  : "Guardar cambios"
                : "Continuar a la ubicación"
            }
            disabled={
              !esEdicion &&
              (!tipoProblema ||
                descripcion.trim().length < 10 ||
                recorderState.isRecording ||
                procesandoAudio)
            }
            onPress={() => {
              if (descripcion.trim().length < 10) {
                Alert.alert(
                  "Descripción incompleta",
                  "Describí el problema con al menos 10 caracteres.",
                );
                return;
              }

              if (esEdicion) {
                void guardarEdicion();
              } else {
                setMostrarUbicacion(true);
              }
            }}
          />
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{ title: esEdicion ? "Editar reporte" : "Nuevo reporte" }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="title">
          {esEdicion ? "Editar reporte" : "Nuevo reporte"}
        </ThemedText>

        <ThemedText style={styles.description}>
          {esEdicion
            ? "Podés reemplazar las fotos adjuntas. Los datos de ubicación y tipo de problema se mantienen."
            : "Para crear un reporte necesitás adjuntar una foto del problema."}
        </ThemedText>

        <View style={styles.previewContainer}>
          <ThemedText type="subtitle">Foto principal (obligatoria)</ThemedText>

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
            <ThemedText>Todavía no agregaste la foto principal.</ThemedText>
          )}

          <Button
            title={foto ? "Tomar otra foto principal" : "Tomar foto"}
            onPress={() => abrirCamara(false)}
          />

          <Button
            title={
              foto
                ? "Elegir otra imagen principal"
                : "Elegir imagen de la galería"
            }
            onPress={() => elegirDeGaleria(false)}
          />
        </View>

        {foto && (
          <View style={styles.previewContainer}>
            <ThemedText type="subtitle">Segunda foto (opcional)</ThemedText>

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

                <Button
                  title="Eliminar segunda foto"
                  onPress={() => {
                    eliminarArchivoTemporal(fotoSecundaria);
                    setFotoSecundaria(null);
                  }}
                />
              </>
            ) : (
              <ThemedText>
                Podés agregar otra foto desde un ángulo diferente.
              </ThemedText>
            )}

            <Button
              title={
                fotoSecundaria
                  ? "Tomar otra segunda foto"
                  : "Agregar segunda foto (opcional)"
              }
              onPress={() => abrirCamara(true)}
            />

            <Button
              title={
                fotoSecundaria
                  ? "Elegir otra segunda imagen"
                  : "Elegir segunda imagen de la galería"
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
    backgroundColor: "#000000",
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 16,
  },
  captureButton: {
    backgroundColor: "#003785",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
  },
  captureButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  cancelButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 25,
  },
  cancelButtonText: {
    color: "#003785",
    fontWeight: "bold",
  },
  previewContainer: {
    marginTop: 8,
    gap: 12,
  },
  mapaUbicacionContainer: {
  width: "100%",
  height: 300,
  overflow: "hidden",
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#777777",
  },

  mapaUbicacion: {
  flex: 1,
  backgroundColor: "#EEEEEE",
  },

  preview: {
    width: "100%",
    height: 250,
    borderRadius: 12,
  },
  successText: {
    fontWeight: "bold",
  },
  recordingText: {
    color: "#D32F2F",
    fontWeight: "bold",
  },
  audioContainer: {
    marginTop: 8,
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#777777",
    borderRadius: 10,
  },
  coordinatesContainer: {
    marginTop: 8,
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#777777",
    borderRadius: 10,
  },
  continueContainer: {
    marginTop: 8,
  },
  tiposContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tipoButton: {
    borderWidth: 1,
    borderColor: "#777777",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  tipoButtonSelected: {
    backgroundColor: "#003785",
    borderColor: "#003785",
  },
  tipoText: {},

  tipoTextSelected: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  descriptionInput: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: "#777777",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: "#222222",
  },
  counterText: {
    fontSize: 12,
    textAlign: "right",
  },
  helpText: {
    fontSize: 13,
  },
});
