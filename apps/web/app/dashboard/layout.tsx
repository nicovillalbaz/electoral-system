"use client";

import Sidebar from "./components/sidebar";
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
      <Sidebar />
      
      {/* AJUSTES DE DISEÑO: 
         - md:ml-72: Porque ensanchamos el Sidebar para que se vea más moderno.
         - bg-gradient: Un fondo sutil para que no sea plano.
         - animate-in: Efecto suave al cargar.
      */}
      <main className="flex-1 md:ml-72 p-8 lg:p-12 overflow-y-auto h-screen bg-gradient-to-br from-background via-background to-zinc-950">
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 slide-in-from-bottom-4">
          {children}
        </div>
      </main>
    </div>
  );
}