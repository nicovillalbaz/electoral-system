import { User, Shield, Truck, Briefcase, DollarSign, Users } from "lucide-react";

export const ROLE_ICONS: Record<string, any> = {
  JEFE: Briefcase,
  JEFE_PC: Briefcase,
  JEFE_DE_PC: Briefcase,
  "JEFE_CAMPAÑA": Briefcase,
  COORDINADOR: Shield,
  SEGURIDAD: Shield,
  CHOFER: Truck,
  LOGISTICA: Truck,
  PUNTERO: Users,
  CAJA: DollarSign,
  MESA_TESTIGO: Shield,
  OTRO: User,
  DEFAULT: User
};

export const ROLE_COLORS: Record<string, string> = {
  JEFE: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  JEFE_PC: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  JEFE_DE_PC: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  "JEFE_CAMPAÑA": "text-purple-400 bg-purple-400/10 border-purple-400/20",
  COORDINADOR: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
  SEGURIDAD: "text-red-400 bg-red-400/10 border-red-400/20",
  CHOFER: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  LOGISTICA: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  PUNTERO: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  CAJA: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  MESA_TESTIGO: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  OTRO: "text-zinc-400 bg-zinc-800 border-zinc-700",
  DEFAULT: "text-zinc-400 bg-zinc-800 border-zinc-700"
};

export const ROLE_LABELS: Record<string, string> = {
  CHOFER: "Choferes",
  PUNTERO: "Punteros",
  JEFE_PC: "Jefes de PC",
  JEFE_DE_PC: "Jefes de PC",
  JEFE: "Jefes",
  "JEFE_CAMPAÑA": "Jefes de Campana",
  COORDINADOR: "Coordinadores",
  MESA_TESTIGO: "Mesa Testigo",
  LOGISTICA: "Logistica",
  SEGURIDAD: "Seguridad",
  CAJA: "Caja",
  OTRO: "Otros"
};
