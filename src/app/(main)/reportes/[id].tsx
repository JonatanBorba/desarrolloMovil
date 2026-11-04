import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { colorEstado, nombreEstado } from "@/constants/estados";
import { obtenerReportePorIdConPublicos } from "@/services/reportes";
import type { Reporte } from "@/tipos/reporte";

function fechaLegible(fecha: string): string {
  const valor = new Date(fecha);

  if (Number.isNaN(valor.getTime())) {
    return fecha;
  }

  return valor.toLocaleString("es-AR");
}

export default function DetalleReporteScreen() {
  const parametros = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(parametros.id) ? parametros.id[0] : parametros.id;

  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargarReporte = useCallback(async () => {
    if (!id) {
      setReporte(null);
      setCargando(false);
      return;
    }

    setCargando(true);
    setError(false);

    try {
      const guardado = await obtenerReportePorIdConPublicos(id);
      setReporte(guardado);
    } catch (e) {
      console.error("Error al cargar el detalle del reporte:", e);
      setError(true);
    } finally {
      setCargando(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      cargarReporte();
    }, [cargarReporte]),
  );

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

  const fotoArreglo =
    reporte.fotoArregloUrlLocal ?? reporte.fotoArregloUrlRemota;

  const motivoRechazo =
    reporte.estadoActual === "RECHAZADO"
      ? ([...reporte.cambios]
          .reverse()
          .find((cambio) => cambio.estado === "RECHAZADO")?.comentario ??
        "El municipio no registró un motivo.")
      : null;

  return (
    <ThemedView style={styles.contenedor}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <ThemedText type="title">Detalle del reporte</ThemedText>

        <View style={styles.tarjeta}>
          <ThemedText type="subtitle">{reporte.tipo}</ThemedText>
          <ThemedText>
            Código de seguimiento: {reporte.codigoSeguimiento}
          </ThemedText>

          <View style={styles.fila}>
            <ThemedText>Estado actual:</ThemedText>
            <View
              style={[
                styles.chip,
                { backgroundColor: colorEstado(reporte.estadoActual) },
              ]}
            >
              <ThemedText style={styles.chipTexto}>
                {nombreEstado(reporte.estadoActual)}
              </ThemedText>
            </View>
          </View>

          {reporte.vecinosSumados > 0 && (
            <ThemedText>
              {reporte.vecinosSumados}{" "}
              {reporte.vecinosSumados === 1
                ? "vecino se sumó a este reclamo"
                : "vecinos se sumaron a este reclamo"}
            </ThemedText>
          )}

          <ThemedText>
            Descripción: {reporte.descripcionTexto || "Sin descripción"}
          </ThemedText>
          <ThemedText>Dirección: {reporte.direccionDescripcion}</ThemedText>
          <ThemedText>
            Fecha de creación: {fechaLegible(reporte.cambios[0]?.fecha ?? "")}
          </ThemedText>
        </View>

        {motivoRechazo && (
          <View style={styles.rechazo}>
            <ThemedText type="subtitle" style={styles.rechazoTitulo}>
              Motivo del rechazo
            </ThemedText>
            <ThemedText>{motivoRechazo}</ThemedText>
          </View>
        )}

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

        {fotoArreglo && (
          <>
            <ThemedText type="subtitle">Foto del arreglo</ThemedText>
            <Image
              source={{ uri: fotoArreglo }}
              style={styles.fotoGrande}
              resizeMode="cover"
            />
          </>
        )}

        <ThemedText type="subtitle">Qué fue pasando</ThemedText>

        {reporte.cambios.length > 0 ? (
          reporte.cambios.map((cambio) => (
            <View key={cambio.id} style={styles.evento}>
              <View
                style={[
                  styles.punto,
                  { backgroundColor: colorEstado(cambio.estado) },
                ]}
              />
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
          <ThemedText>Todavía no hay cambios de estado registrados.</ThemedText>
        )}

        <ThemedText type="subtitle">Audio</ThemedText>
        <ThemedText>
          {reporte.descripcionAudioUrlLocal || reporte.descripcionAudioUrlRemota
            ? "El reporte tiene una descripción de audio asociada."
            : "Este reporte no tiene audio adjunto."}
        </ThemedText>

        <ThemedText type="subtitle">Código para seguimiento</ThemedText>
        <View style={styles.codigo}>
          <QRCode value={reporte.codigoSeguimiento} size={180} />
          <ThemedText type="title">{reporte.codigoSeguimiento}</ThemedText>
          <ThemedText>
            Mostrá este QR en el mostrador para que abran tu reclamo sin tipear.
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
    borderColor: "#888888",
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  fotos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  foto: {
    width: 145,
    height: 145,
    borderRadius: 10,
  },
  fila: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  chip: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  chipTexto: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  rechazo: {
    borderWidth: 1,
    borderColor: "#C62828",
    borderRadius: 12,
    padding: 16,
    gap: 8,
    backgroundColor: "rgba(198, 40, 40, 0.08)",
  },
  rechazoTitulo: {
    color: "#C62828",
  },
  fotoGrande: {
    width: "100%",
    height: 220,
    borderRadius: 12,
  },
  evento: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 12,
  },
  punto: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 5,
  },
  eventoContenido: {
    flex: 1,
    gap: 4,
  },
  codigo: {
    borderWidth: 1,
    borderColor: "#888888",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
});
