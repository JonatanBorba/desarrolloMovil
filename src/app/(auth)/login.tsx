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

import { loginMock, type UserRole } from "@/services/auth";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("vecino@example.com");
  const [password, setPassword] = useState("vecino123");
  const [role, setRole] = useState<UserRole>("vecino");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Datos incompletos", "Ingresá usuario y contraseña.");
      return;
    }

    try {
      setLoading(true);
      const session = await loginMock(email.trim(), password.trim(), role);

      if (!session.token) {
        throw new Error("No se pudo iniciar sesión.");
      }

      if (session.role === "operador") {
        router.replace("/(operador)/bandeja");
      } else {
        router.replace("/(main)");
      }
    } catch (error: any) {
      Alert.alert(
        "Error de inicio de sesión",
        error?.message ?? "Revisá las credenciales.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.card}>
        <ThemedText type="title" style={styles.title}>
          Ingresar
        </ThemedText>

        <ThemedText style={styles.label}>Correo electrónico</ThemedText>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
          placeholder="vecino@example.com"
        />

        <ThemedText style={styles.label}>Contraseña</ThemedText>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          placeholder="••••••••"
        />

        <ThemedText style={styles.label}>Ingresar como</ThemedText>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[
              styles.roleButton,
              role === "vecino" && styles.roleButtonActive,
            ]}
            onPress={() => setRole("vecino")}
            disabled={loading}
          >
            <ThemedText style={styles.roleLabel}>Vecino</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleButton,
              role === "operador" && styles.roleButtonActive,
            ]}
            onPress={() => setRole("operador")}
            disabled={loading}
          >
            <ThemedText style={styles.roleLabel}>Operador</ThemedText>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.submitLabel}>Ingresar</ThemedText>
          )}
        </TouchableOpacity>

        <View style={styles.helperTextContainer}>
          <ThemedText style={styles.helperText}>Usuarios de prueba:</ThemedText>
          <ThemedText style={styles.helperText}>
            vecino@example.com / vecino123
          </ThemedText>
          <ThemedText style={styles.helperText}>
            operador@example.com / operador123
          </ThemedText>
        </View>
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
  title: {textAlign: "center",
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
  roleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 8,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  roleButtonActive: {
    borderColor: "#003785",
    backgroundColor: "#E3F2FD",
  },
  roleLabel: {
    textAlign: "center",
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
  helperTextContainer: {
    marginTop: 16,
    gap: 2,
  },
  helperText: {
    fontSize: 12,
  },
});
    