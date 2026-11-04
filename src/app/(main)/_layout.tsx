import { Tabs } from "expo-router";

export default function MainLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="reportes/index"
        options={{
          title: "Mis reportes",
        }}
      />

      <Tabs.Screen
        name="reportes/nuevo"
        options={{
          title: "Reportar",
        }}
      />

      <Tabs.Screen
        name="mapa/index"
        options={{
          title: "Mapa",
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
