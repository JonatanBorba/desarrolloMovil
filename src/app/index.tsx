import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import * as LocalAuthentication from "expo-local-authentication";
import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getStoredSession } from "@/services/auth";

export default function HomeScreen() {
  const router = useRouter();
  const [mostrarSplash, setMostrarSplash] = useState(true);
  const [nombreGuardado, setNombreGuardado] = useState<string | null>(null);
  const [entrandoConHuella, setEntrandoConHuella] = useState(false);
  const esOscuro = useColorScheme() === "dark";

  useEffect(() => {
    const timer = setTimeout(() => {
      setMostrarSplash(false);
    }, 2000);

    void getStoredSession().then((sesion) => {
      if (sesion?.usuario?.nombre) {
        setNombreGuardado(sesion.usuario.nombre);
      }
    });

    return () => clearTimeout(timer);
  }, []);

  // Reingreso con huella/rostro (punto 2). Si el dispositivo no tiene
  // biometría, queda el ingreso con contraseña como alternativa.
  const ingresarConBiometria = async () => {
    if (entrandoConHuella) return;

    try {
      setEntrandoConHuella(true);

      const hayHardware = await LocalAuthentication.hasHardwareAsync();
      const hayRegistrada = await LocalAuthentication.isEnrolledAsync();

      if (!hayHardware || !hayRegistrada) {
        Alert.alert(
          "Sin biometría",
          "Este dispositivo no tiene huella ni rostro configurado. Ingresá con tu contraseña.",
        );
        router.push("/(auth)/login");
        return;
      }

      const resultado = await LocalAuthentication.authenticateAsync({
        promptMessage: "Continuá con tu huella o rostro",
        cancelLabel: "Cancelar",
      });

      if (!resultado.success) return;

      const sesion = await getStoredSession();
      if (!sesion) {
        router.push("/(auth)/login");
        return;
      }

      router.replace(
        sesion.role === "operador" ? "/(operador)/bandeja" : "/(main)/reportes",
      );
    } catch (error) {
      console.warn("No se pudo autenticar con biometría:", error);
    } finally {
      setEntrandoConHuella(false);
    }
  };

  if (mostrarSplash) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require("../../assets/images/imagen_inicio.png")}
          style={styles.splashImagen}
        />
      </View>
    );
  }

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
              source={
                esOscuro
                  ? require("../../assets/images/escudo-blanco.png")
                  : require("../../assets/images/logo-escudo-transparente.png")
              }
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
            {nombreGuardado ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  void ingresarConBiometria();
                }}
                disabled={entrandoConHuella}
              >
                <ThemedText type="default" style={styles.primaryLabel}>
                  {entrandoConHuella
                    ? "Autenticando..."
                    : `Continuar como ${nombreGuardado}`}
                </ThemedText>
              </TouchableOpacity>
            ) : null}

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
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: "#0C5376",
    justifyContent: "center",
    alignItems: "center",
  },
  splashImagen: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
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
});
