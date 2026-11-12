import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { nombreEstado } from "@/constants/estados";
import { obtenerBandeja, zonaDelOperador } from "@/services/operador";
import { obtenerTiposDeReporte } from "@/services/reportes";
import type { EstadoReporteApi } from "@/tipos/api";
import type { Reporte, TipoDeReporte } from "@/tipos/reporte";

const ESTADOS: Array<{ etiqueta: string; valor: EstadoReporteApi | "TODOS" }> =
  [
    { etiqueta: "Todos", valor: "TODOS" },
    { etiqueta: "Recibido", valor: "recibido" },
    { etiqueta: "En revisión", valor: "en_revision" },
    { etiqueta: "Asignado", valor: "asignado" },
    { etiqueta: "Resuelto", valor: "resuelto" },
    { etiqueta: "Rechazado", valor: "rechazado" },
  ];

export default function BandejaOperadorScreen() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [tipos, setTipos] = useState<TipoDeReporte[]>([]);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<
    EstadoReporteApi | "TODOS"
  >("TODOS");
  const [tipoSeleccionado, setTipoSeleccionado] = useState<string | null>(null);
  const [soloMiZona, setSoloMiZona] = useState(true);
  const [miZona, setMiZona] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  const cargarReportes = useCallback(async () => {
    setCargando(true);
    setError(false);

    try {
      const zonaOperador = await zonaDelOperador();
      setMiZona(zonaOperador);

      const [datos, tiposApi] = await Promise.all([
        obtenerBandeja({
          estado:
            estadoSeleccionado === "TODOS" ? undefined : estadoSeleccionado,
          tipoId: tipoSeleccionado ?? undefined,
          zonaId: soloMiZona && zonaOperador ? zonaOperador : "todas",
        }),
        obtenerTiposDeReporte(),
      ]);

      setReportes(datos);
      setTipos(tiposApi);
    } catch (e) {
      console.error("Error al cargar la bandeja:", e);
      setError(true);
    } finally {
      setCargando(false);
    }
  }, [estadoSeleccionado, tipoSeleccionado, soloMiZona]);

  useFocusEffect(
    useCallback(() => {
      void cargarReportes();
    }, [cargarReportes]),
  );

  return (
    <ThemedView style={styles.contenedor}>
      <ThemedText type="title">Bandeja de reportes</ThemedText>

      <ThemedText>Reportes abiertos: {reportes.length}</ThemedText>

      <Pressable
        accessibilityRole="button"
        style={styles.botonEscanear}
        onPress={() => router.push("/(operador)/escanear")}
      >
        <ThemedText style={styles.textoBotonEscanear}>▦ Escanear QR</ThemedText>
      </Pressable>

      {miZona ? (
        <View style={styles.filtros}>
          <Pressable
            onPress={() => setSoloMiZona(true)}
            style={[styles.filtro, soloMiZona && styles.filtroActivo]}
          >
            <ThemedText>Mi zona</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setSoloMiZona(false)}
            style={[styles.filtro, !soloMiZona && styles.filtroActivo]}
          >
            <ThemedText>Todas las zonas</ThemedText>
          </Pressable>
        </View>
      ) : null}

      <ThemedText type="subtitle">Filtrar por estado</ThemedText>

      <View style={styles.filtros}>
        {ESTADOS.map((estado) => (
          <Pressable
            key={estado.valor}
            onPress={() => setEstadoSeleccionado(estado.valor)}
            style={[
              styles.filtro,
              estadoSeleccionado === estado.valor && styles.filtroActivo,
            ]}
          >
            <ThemedText>{estado.etiqueta}</ThemedText>
          </Pressable>
        ))}
      </View>

      <ThemedText type="subtitle">Filtrar por tipo</ThemedText>

      <View style={styles.filtros}>
        <Pressable
          onPress={() => setTipoSeleccionado(null)}
          style={[
            styles.filtro,
            tipoSeleccionado === null && styles.filtroActivo,
          ]}
        >
          <ThemedText>Todos</ThemedText>
        </Pressable>
        {tipos.map((tipo) => (
          <Pressable
            key={tipo.id}
            onPress={() => setTipoSeleccionado(tipo.id)}
            style={[
              styles.filtro,
              tipoSeleccionado === tipo.id && styles.filtroActivo,
            ]}
          >
            <ThemedText>{tipo.nombre}</ThemedText>
          </Pressable>
        ))}
      </View>

      {cargando ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" />
          <ThemedText>Cargando reportes...</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.centrado}>
          <ThemedText>No se pudieron cargar los reportes guardados.</ThemedText>

          <Pressable onPress={cargarReportes} style={styles.boton}>
            <ThemedText style={styles.textoBoton}>Reintentar</ThemedText>
          </Pressable>
        </View>
      ) : reportes.length === 0 ? (
        <View style={styles.centrado}>
          <ThemedText>
            No hay reportes que coincidan con los filtros seleccionados.
          </ThemedText>
        </View>
      ) : (
        <FlatList
          style={styles.lista}
          data={reportes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.contenidoLista}
          renderItem={({ item }) => (
            <Pressable
              style={styles.tarjeta}
              onPress={() =>
                router.push({
                  pathname: "/(operador)/reporte/[id]",
                  params: { id: item.id },
                })
              }
            >
              <ThemedText type="subtitle">{item.tipo}</ThemedText>
              <ThemedText>Código: {item.codigoSeguimiento}</ThemedText>
              <ThemedText>Estado: {nombreEstado(item.estadoActual)}</ThemedText>
              <ThemedText>
                {item.descripcionTexto || "Sin descripción escrita"}
              </ThemedText>
              <ThemedText>
                Zona: {item.zonaId} · {item.vecinosSumados} vecinos sumados
              </ThemedText>
              <ThemedText style={styles.enlace}>
                Abrir gestión del reporte →
              </ThemedText>
            </Pressable>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    padding: 16,
  },
  botonEscanear: {
    backgroundColor: "#246B45",
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: "center",
    marginVertical: 10,
  },
  textoBotonEscanear: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  filtros: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 8,
  },
  filtro: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#888888",
    borderRadius: 20,
  },
  filtroActivo: {
    backgroundColor: "#DCEBFF",
    borderColor: "#003785",
  },
  lista: {
    flex: 1,
    marginTop: 12,
  },
  contenidoLista: {
    paddingBottom: 24,
    gap: 12,
  },
  tarjeta: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#888888",
    gap: 8,
  },
  centrado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 16,
  },
  boton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#003785",
  },
  textoBoton: {
    color: "#FFFFFF",
  },
  enlace: {
    marginTop: 4,
    fontWeight: "bold",
  },
});
