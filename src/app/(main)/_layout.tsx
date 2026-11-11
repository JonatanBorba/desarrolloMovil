
import * as Network from "expo-network";
import { Tabs } from "expo-router";
import { useEffect } from "react";

import { sincronizarPendientes } from "@/services/reportes";

export default function MainLayout() {
  useEffect(() => {
    let activo = true;
    let ultimaConexion = false;
    let sincronizando = false;

    const intentarSincronizar = async () => {
      if (!activo || sincronizando) return;

      sincronizando = true;

      try {
        await sincronizarPendientes();
      } catch (error) {
        console.warn("No se pudieron sincronizar los reportes:", error);
      } finally {
        sincronizando = false;
      }
    };

    const actualizarConexion = (estado: Network.NetworkState) => {
      if (!activo) return;

      const conectado =
        estado.isConnected === true &&
        estado.isInternetReachable !== false;

      if (conectado && !ultimaConexion) {
        void intentarSincronizar();
      }

      ultimaConexion = conectado;
    };

    Network.getNetworkStateAsync()
      .then((estado) => {
        if (!activo) return;

        const conectado =
          estado.isConnected === true &&
          estado.isInternetReachable !== false;

        ultimaConexion = conectado;

        if (conectado) {
          void intentarSincronizar();
        }
      })
      .catch((error) => {
        console.warn("No se pudo consultar la conexión:", error);
      });

    const suscripcion =
      Network.addNetworkStateListener(actualizarConexion);

    return () => {
      activo = false;
      suscripcion.remove();
    };
  }, []);

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
