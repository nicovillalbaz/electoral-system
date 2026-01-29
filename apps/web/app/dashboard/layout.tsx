"use client"; // <--- Importante para usar useEffect

import Sidebar from "../../components/sidebar";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      router.push("/login");
      return;
    }
    
    try {
      const user = JSON.parse(userStr);
      // Si es Operador o Voluntario, FUERA DEL DASHBOARD
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
    <div className="min-h-screen bg-black text-zinc-100 flex">
      <Sidebar />
      <main className="flex-1 md:ml-64 p-8 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}