import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Link } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const [mostrarSplash, setMostrarSplash] = useState(true);

  useEffect(() => {
    // Temporizador de 2000 ms (2 segundos)
    const timer = setTimeout(() => {
      setMostrarSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // 1. PANTALLA TEMPORAL (Splash pantalla completa)
  if (mostrarSplash) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require("../../assets/images/inicio.png")}
          style={styles.splashImagen}
        />
      </View>
    );
  }

  // 2. PANTALLA PRINCIPAL
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo en la pantalla principal */}
          <View style={styles.imageContainer}>
            <Image
              source={require("../../assets/images/LogoMunicipio.png")}
              style={styles.imagen}
            />
          </View>

          <ThemedText type="title" style={styles.title}>
            REPORTE CIUDADANO
          </ThemedText>

          <ThemedText style={styles.subtitle}>
            Aplicación para que los vecinos reporten problemas en la vía pública
            y sigan el estado de sus reclamos.
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

          {/* Enlaces temporales para desarrollo */}
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
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // Estilos de la Pantalla Splash a pantalla completa
  splashContainer: {
    flex: 1,
    backgroundColor: "#0084C7", // Azul de fondo coincidente con la imagen
    justifyContent: "center",
    alignItems: "center",
  },
  splashImagen: {
    width: "100%",
    height: "100%",
    resizeMode: "cover", // Cubre toda la pantalla sin distorsionar
  },

  // Estilos de la Pantalla Principal
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 16,
    alignItems: "center",
  },
  imageContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  imagen: {
    width: 140,
    height: 140,
    resizeMode: "contain",
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
  },
  actions: {
    width: "100%",
    marginTop: 16,
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
    width: "100%",
    marginTop: 24,
    gap: 4,
  },
  link: {
    marginTop: 4,
  },
});
