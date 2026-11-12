import { useNetworkState } from "expo-network";
import { StyleSheet, Text, View } from "react-native";

/**
 * Punto 7: avisa en pantalla el estado de la red. Muestra una banda en
 * la parte inferior cuando el dispositivo no tiene conexión usable; la
 * app igualmente sigue abriendo y mostrando los datos guardados.
 */
export function IndicadorRed() {
  const estado = useNetworkState();

  const sinRed =
    estado.isConnected === false || estado.isInternetReachable === false;

  if (!sinRed) return null;

  return (
    <View style={styles.banda} pointerEvents="none">
      <Text style={styles.texto}>
        Sin conexión — se muestran los datos guardados en el dispositivo
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banda: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#C1440E",
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    zIndex: 999,
  },
  texto: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
