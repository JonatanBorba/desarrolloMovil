import { Link } from "expo-router";
import { StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Reporte Ciudadano Gualeguaychú
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Aplicación para que los vecinos reporten problemas en la vía pública y
          sigan el estado de sus reclamos.
        </ThemedText>

        <ThemedView style={styles.actions}>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.primaryButton}>
              <ThemedText type="default" style={styles.primaryLabel}>
                Ingresar
              </ThemedText>
            </TouchableOpacity>
          </Link>

          <Link href="/(auth)/register" asChild>
            <TouchableOpacity style={styles.secondaryButton}>
              <ThemedText type="default" style={styles.secondaryLabel}>
                Registrarme
              </ThemedText>
            </TouchableOpacity>
          </Link>
        </ThemedView>

        {/* Enlace temporales para explorar las otras pantallas mientras no haya login real */}
        <ThemedView style={styles.debugLinks}>
          <ThemedText type="small">
            Pantallas de prueba (solo para desarrollo):
          </ThemedText>
          <Link href="/(main)" style={styles.link}>
            <ThemedText type="link">Inicio vecino</ThemedText>
          </Link>
          <Link href="/(main)/reportes/nuevo" style={styles.link}>
            <ThemedText type="link">Nuevo reporte</ThemedText>
          </Link>
          <Link href="/(main)/reportes" style={styles.link}>
            <ThemedText type="link">Mis reportes</ThemedText>
          </Link>
          <Link href="/(main)/mapa" style={styles.link}>
            <ThemedText type="link">Mapa de la ciudad</ThemedText>
          </Link>
          <Link href="/(operador)/bandeja" style={styles.link}>
            <ThemedText type="link">Bandeja del operador</ThemedText>
          </Link>
          <Link href="/(operador)/cuadrillas" style={styles.link}>
            <ThemedText type="link">Zonas y cuadrillas</ThemedText>
          </Link>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  safeArea: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    gap: 24,
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
  },
  actions: {
    marginTop: 32,
    gap: 16,
  },
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: 40,
    backgroundColor: "#003785",
  },
  primaryLabel: {
    textAlign: "center",
    color: "#FFFFFF",
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: 40,
    backgroundColor: "#003785",
  },
  secondaryLabel: {
    textAlign: "center",
    color: "#FFFFFF",
  },
  debugLinks: {
    marginTop: 40,
    gap: 4,
  },
  link: {
    marginTop: 4,
  },
});
