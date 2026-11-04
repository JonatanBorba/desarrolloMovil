import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { registrarse } from "@/services/auth";

export default function RegisterScreen() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!nombre.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Datos incompletos", "Completá todos los campos.");
      return;
    }
    if (!email.includes("@")) {
      Alert.alert("Correo inválido", "Revisá el correo electrónico.");
      return;
    }
    if (password.length < 8) {
      Alert.alert(
        "Contraseña corta",
        "La contraseña debe tener al menos 8 caracteres.",
      );
      return;
    }

    try {
      setLoading(true);
      await registrarse(nombre.trim(), email.trim(), password);

      // Las cuentas nuevas son siempre vecinos: van a las pestañas.
      router.replace("/(main)/reportes");
    } catch (error: any) {
      Alert.alert(
        "No se pudo registrar",
        error?.message ?? "Intentá de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.card}>
        <ThemedText type="title" style={styles.title}>
          Crear cuenta
        </ThemedText>

        <ThemedText style={styles.label}>Nombre completo</ThemedText>
        <TextInput
          value={nombre}
          onChangeText={setNombre}
          autoCapitalize="words"
          style={styles.input}
          placeholder="Ej: Norma Pereyra"
        />

        <ThemedText style={styles.label}>Correo electrónico</ThemedText>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          placeholder="tu@correo.com"
        />

        <ThemedText style={styles.label}>Contraseña</ThemedText>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          placeholder="Mínimo 8 caracteres"
        />

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.submitLabel}>Registrarme</ThemedText>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} disabled={loading}>
          <ThemedText type="link" style={styles.volver}>
            Ya tengo cuenta, volver
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  title: {
    textAlign: "center",
    marginBottom: 16,
  },
  label: {
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderColor: "#CCCCCC",
    backgroundColor: "#FFFFFF",
  },
  submitButton: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: "#003785",
  },
  submitLabel: {
    color: "#FFFFFF",
  },
  volver: {
    marginTop: 16,
    textAlign: "center",
  },
});
