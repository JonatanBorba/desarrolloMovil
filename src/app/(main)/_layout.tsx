import { Tabs } from 'expo-router';

export default function MainLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
        }}
      />

      <Tabs.Screen
        name="reportes/index"
        options={{
          title: 'Mis reportes',
        }}
      />

      <Tabs.Screen
        name="mapa/index"
        options={{
          title: 'Mapa',
        }}
      />

      <Tabs.Screen
        name="reportes/nuevo"
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