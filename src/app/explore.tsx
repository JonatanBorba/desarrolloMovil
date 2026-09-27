import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export default function TabTwoScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + Spacing.six,
        paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
        paddingHorizontal: Spacing.four,
        alignItems: "center",
      }}
    >
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle" style={styles.title}>
          Acerca de esta aplicación
        </ThemedText>
        <ThemedText style={styles.body}>
          Reporte Ciudadano es la aplicación de la Municipalidad de Gualeguaychú
          para que los vecinos puedan informar baches, luminarias quemadas,
          basura, ramas peligrosas y otros problemas en la vía pública.
        </ThemedText>
        <ThemedText style={styles.body}>
          Desde la app se pueden crear nuevos reportes con foto y ubicación,
          seguir el estado de los reclamos realizados, consultar el mapa de
          reportes de la ciudad y, en el caso de los operadores municipales,
          gestionar la bandeja de reclamos y las cuadrillas.
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  title: {
    textAlign: "center",
  },
  body: {
    textAlign: "left",
  },
});
