"use client";

import Sidebar from "./components/sidebar";
import OfflineIndicator from "./components/OfflineIndicator";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // --- LÓGICA DE PROTECCIÓN (NO BORRAR) ---
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/login");
      return;
    }
    
    try {
      const user = JSON.parse(userStr);
      // Si es Operador o Voluntario, no deben ver el Dashboard estratégico
      if (["OPERATOR", "VOLUNTEER"].includes(user.role)) {
        router.push("/operator/checkin");
      }
    } catch (e) {
      // Si el JSON está corrupto, limpiar y salir
      localStorage.removeItem("user");
      router.push("/login");
    }
  }, []);

  return (
    // CAMBIO DE DISEÑO: Usamos las variables semánticas (background/foreground)
    <div className="min-h-screen bg-background text-foreground flex font-sans antialiased selection:bg-red-500/30">
      <OfflineIndicator />
      <Sidebar />
      
      {/* AJUSTES DE DISEÑO: Responsive Margin */}
      <main className="flex-1 md:ml-20 lg:ml-72 p-4 md:p-8 lg:p-12 overflow-y-auto h-screen bg-gradient-to-br from-background via-background to-zinc-950 transition-all duration-300">
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
          {children}
        </div>
      </main>
    </div>
  );
}