import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  colorEstado,
  ESTADOS_ORDENADOS,
  nombreEstado,
} from "@/constants/estados";
import {
  obtenerReportesPublicos,
  obtenerTiposDeReporte,
  sumarseAReporte,
} from "@/services/reportes";
import type { EstadoReporte, Reporte } from "@/tipos/reporte";

// Gualeguaychú, Entre Ríos (centro de la ciudad).
const CENTRO = { lat: -33.0094, lon: -58.518 };

/**
 * El mapa es un Leaflet dentro de un WebView: react-native-maps usa el
 * proveedor de Google y en Expo Go queda negro sin API key paga. Los
 * marcadores se inyectan como circleMarkers de colores y los toques
 * vuelven por ReactNativeWebView.postMessage.
 */
const HTML_MAPA = `<!DOCTYPE html>
<html>
  <head>
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    />
    <style>
      html, body, #mapa { height: 100%; margin: 0; padding: 0; }
    </style>
  </head>
  <body>
    <div id="mapa"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      var mapa = L.map("mapa").setView([${CENTRO.lat}, ${CENTRO.lon}], 15);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(mapa);

      var capaMarcadores = L.layerGroup().addTo(mapa);
      var miUbicacion = null;

      mapa.on("click", function () {
        window.ReactNativeWebView.postMessage("__mapa__");
      });

      window.colocarMarcadores = function (json) {
        capaMarcadores.clearLayers();
        var datos = JSON.parse(json);
        datos.forEach(function (r) {
          var m = L.circleMarker([r.latitud, r.longitud], {
            radius: 10,
            color: "#ffffff",
            weight: 2,
            fillColor: r.color,
            fillOpacity: 1,
          }).addTo(capaMarcadores);
          m.on("click", function (e) {
            L.DomEvent.stopPropagation(e);
            window.ReactNativeWebView.postMessage(r.id);
          });
        });
        return datos.length;
      };

      window.centrarEn = function (lat, lon) {
        mapa.flyTo([lat, lon], 16);
        if (miUbicacion) mapa.removeLayer(miUbicacion);
        miUbicacion = L.circleMarker([lat, lon], {
          radius: 8,
          color: "#ffffff",
          weight: 2,
          fillColor: "#003785",
          fillOpacity: 1,
        }).addTo(mapa);
      };
    </script>
  </body>
</html>`;

export default function MapaReportesScreen() {
  const webViewRef = useRef<WebView>(null);
  const [mapaListo, setMapaListo] = useState(false);

  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [tipos, setTipos] = useState<string[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<EstadoReporte | null>(null);

  const [seleccionado, setSeleccionado] = useState<Reporte | null>(null);
  const [ubicacionUsuario, setUbicacionUsuario] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [sumando, setSumando] = useState(false);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(false);
    try {
      const [publicos, tiposApi] = await Promise.all([
        obtenerReportesPublicos(),
        obtenerTiposDeReporte(),
      ]);
      setReportes(publicos);
      setTipos(tiposApi.map((tipo) => tipo.nombre));
    } catch (e) {
      console.error("Error al cargar el mapa de reportes:", e);
      setError(true);
    } finally {
      setCargando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [cargarDatos]),
  );

  const reportesFiltrados = useMemo(
    () =>
      reportes.filter(
        (reporte) =>
          (!filtroTipo || reporte.tipo === filtroTipo) &&
          (!filtroEstado || reporte.estadoActual === filtroEstado),
      ),
    [reportes, filtroTipo, filtroEstado],
  );

  const centrarEnMiUbicacion = async (avisar = true) => {
    try {
      const permiso = await Location.requestForegroundPermissionsAsync();

      if (!permiso.granted) {
        if (avisar) {
          Alert.alert(
            "Permiso de ubicación",
            "Sin ubicación el mapa funciona igual, pero no podemos mostrarte los reportes cercanos a vos.",
          );
        }
        return;
      }

      const posicion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coordenadas = {
        latitude: posicion.coords.latitude,
        longitude: posicion.coords.longitude,
      };

      setUbicacionUsuario(coordenadas);
      webViewRef.current?.injectJavaScript(
        `window.centrarEn(${coordenadas.latitude}, ${coordenadas.longitude}); true;`,
      );
    } catch (e) {
      console.error("Error al obtener la ubicación:", e);
      if (avisar) {
        Alert.alert(
          "Error",
          "No se pudo obtener tu ubicación. El mapa sigue funcionando normalmente.",
        );
      }
    }
  };

  useEffect(() => {
    if (!mapaListo) return;
    void centrarEnMiUbicacion(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapaListo]);

  // Cada vez que cambian los filtros o llegan datos, se re-dibujan
  // los marcadores dentro del WebView.
  useEffect(() => {
    if (!mapaListo) return;
    const datos = reportesFiltrados.map((r) => ({
      id: r.id,
      latitud: r.latitud,
      longitud: r.longitud,
      color: colorEstado(r.estadoActual),
    }));
    webViewRef.current?.injectJavaScript(
      `window.colocarMarcadores(${JSON.stringify(JSON.stringify(datos))}); true;`,
    );
  }, [reportesFiltrados, mapaListo]);

  const manejarMensajeDelMapa = (evento: { nativeEvent: { data: string } }) => {
    const data = evento.nativeEvent.data;
    if (data === "__mapa__") {
      setSeleccionado(null);
      return;
    }
    const reporte = reportes.find((item) => item.id === data);
    if (reporte) setSeleccionado(reporte);
  };

  const sumarme = async (reporte: Reporte) => {
    if (sumando) return;

    try {
      setSumando(true);
      const actualizado = await sumarseAReporte(reporte.id);

      if (!actualizado) {
        Alert.alert("Error", "No se encontró el reporte.");
        return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setReportes((actuales) =>
        actuales.map((item) =>
          item.id === actualizado.id ? actualizado : item,
        ),
      );
      setSeleccionado(actualizado);
    } catch (e) {
      console.error("Error al sumarse al reporte:", e);
      Alert.alert("Error", "No te pudimos sumar al reporte. Intentá de nuevo.");
    } finally {
      setSumando(false);
    }
  };

  if (cargando) {
    return (
      <ThemedView style={styles.centrado}>
        <ActivityIndicator size="large" />
        <ThemedText>Cargando el mapa de reportes...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centrado}>
        <ThemedText type="title">No se pudo cargar el mapa</ThemedText>
        <ThemedText>Volvé a intentarlo en unos segundos.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.contenedor}>
      {/* Filtros por tipo y estado */}
      <View style={styles.filtros}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filaFiltros}>
            <Pressable
              style={[styles.chipFiltro, !filtroTipo && styles.chipActivo]}
              onPress={() => setFiltroTipo(null)}
            >
              <ThemedText
                style={!filtroTipo ? styles.chipTextoActivo : undefined}
              >
                Todos
              </ThemedText>
            </Pressable>
            {tipos.map((tipo) => (
              <Pressable
                key={tipo}
                style={[
                  styles.chipFiltro,
                  filtroTipo === tipo && styles.chipActivo,
                ]}
                onPress={() => setFiltroTipo(filtroTipo === tipo ? null : tipo)}
              >
                <ThemedText
                  style={
                    filtroTipo === tipo ? styles.chipTextoActivo : undefined
                  }
                >
                  {tipo}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filaFiltros}>
            {ESTADOS_ORDENADOS.map((estado) => (
              <Pressable
                key={estado}
                style={[
                  styles.chipFiltro,
                  {
                    borderColor: colorEstado(estado),
                    backgroundColor:
                      filtroEstado === estado
                        ? colorEstado(estado)
                        : "transparent",
                  },
                ]}
                onPress={() =>
                  setFiltroEstado(filtroEstado === estado ? null : estado)
                }
              >
                <ThemedText
                  style={
                    filtroEstado === estado
                      ? styles.chipTextoActivo
                      : { color: colorEstado(estado) }
                  }
                >
                  {nombreEstado(estado)}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Mapa con Leaflet dentro de un WebView: react-native-maps
          queda negro en Expo Go sin API key de Google. */}
      <WebView
        ref={webViewRef}
        style={styles.mapa}
        originWhitelist={["*"]}
        source={{ html: HTML_MAPA }}
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={() => setMapaListo(true)}
        onMessage={manejarMensajeDelMapa}
      />

      {/* Botón de ubicación */}
      <Pressable
        style={styles.botonUbicacion}
        onPress={() => centrarEnMiUbicacion()}
      >
        <ThemedText style={styles.botonUbicacionTexto}>Cerca de mí</ThemedText>
      </Pressable>

      {/* Tarjeta del reporte seleccionado */}
      {seleccionado && (
        <View style={styles.tarjetaSeleccionada}>
          <View style={styles.fila}>
            <ThemedText type="subtitle" style={styles.tarjetaTitulo}>
              {seleccionado.tipo}
            </ThemedText>
            <View
              style={[
                styles.chipEstado,
                {
                  backgroundColor: colorEstado(seleccionado.estadoActual),
                },
              ]}
            >
              <ThemedText style={styles.chipTextoActivo}>
                {nombreEstado(seleccionado.estadoActual)}
              </ThemedText>
            </View>
          </View>

          <ThemedText>{seleccionado.direccionDescripcion}</ThemedText>

          {seleccionado.vecinosSumados > 0 && (
            <ThemedText>
              {seleccionado.vecinosSumados}{" "}
              {seleccionado.vecinosSumados === 1
                ? "vecino se sumó"
                : "vecinos se sumaron"}
            </ThemedText>
          )}

          <View style={styles.filaBotones}>
            <Pressable
              style={styles.boton}
              onPress={() =>
                router.push({
                  pathname: "/reportes/[id]",
                  params: { id: seleccionado.id },
                })
              }
            >
              <ThemedText style={styles.botonTexto}>Ver detalle</ThemedText>
            </Pressable>

            {seleccionado.yaMeSumé ? (
              <View style={[styles.boton, styles.botonDeshabilitado]}>
                <ThemedText style={styles.botonTexto}>Ya te sumaste</ThemedText>
              </View>
            ) : (
              <Pressable
                style={[styles.boton, styles.botonSumarse]}
                disabled={sumando}
                onPress={() => sumarme(seleccionado)}
              >
                <ThemedText style={styles.botonTexto}>
                  {sumando ? "Sumando..." : "Sumarme al reclamo"}
                </ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
  },
  centrado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 16,
  },
  filtros: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 6,
  },
  filaFiltros: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  chipFiltro: {
    borderWidth: 1,
    borderColor: "#888888",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipActivo: {
    backgroundColor: "#003785",
    borderColor: "#003785",
  },
  chipTextoActivo: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  mapa: {
    flex: 1,
  },
  botonUbicacion: {
    position: "absolute",
    top: 120,
    right: 16,
    backgroundColor: "#003785",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    elevation: 4,
  },
  botonUbicacionTexto: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  atribucion: {
    position: "absolute",
    bottom: 4,
    right: 6,
    fontSize: 10,
    color: "#555555",
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  tarjetaSeleccionada: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderColor: "#CCCCCC",
    padding: 16,
    gap: 8,
  },
  tarjetaTitulo: {
    flex: 1,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  chipEstado: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  filaBotones: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  boton: {
    flex: 1,
    backgroundColor: "#003785",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  botonSumarse: {
    backgroundColor: "#2E7D32",
  },
  botonDeshabilitado: {
    backgroundColor: "#888888",
  },
  botonTexto: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
});
