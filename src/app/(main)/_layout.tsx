import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";

const AZUL = "#003785";
const VERDE = "#2E7D32";

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: AZUL,
        tabBarInactiveTintColor: "#9AA3AD",
        tabBarStyle: styles.barra,
        tabBarLabelStyle: styles.etiqueta,
      }}
    >
      <Tabs.Screen
        name="reportes/index"
        options={{
          title: "Mis reportes",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "documents" : "documents-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="reportes/nuevo"
        options={{
          title: "Reportar",
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.botonCentral,
                focused && styles.botonCentralActivo,
              ]}
            >
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </View>
          ),
          tabBarLabelStyle: styles.etiquetaCentral,
        }}
      />

      <Tabs.Screen
        name="mapa/index"
        options={{
          title: "Mapa",
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? "map-marker-radius" : "map-marker-radius-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="reportes/[id]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barra: {
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
  },
  etiqueta: {
    fontSize: 11,
    fontWeight: "600",
  },
  etiquetaCentral: {
    fontSize: 11,
    fontWeight: "700",
    color: VERDE,
  },
  botonCentral: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginTop: -10,
    backgroundColor: VERDE,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  botonCentralActivo: {
    backgroundColor: "#1B5E20",
    transform: [{ scale: 1.05 }],
  },
});
