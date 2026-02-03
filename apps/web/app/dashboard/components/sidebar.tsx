'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, List, BarChart3,
  MapPin, 
  ShieldAlert, 
  LogOut, 
  UserCog,
  ChevronRight
} from 'lucide-react';

const MENU_ITEMS = [
  { name: 'Tablero de Comando', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Padrón & Votantes', href: '/dashboard/persons', icon: Users },
  { name: 'Listas Inteligentes', icon: List, href: '/dashboard/lists' },
  { name: 'Puestos (PC)', href: '/dashboard/stations', icon: MapPin },
  { name: 'Equipo & Accesos', href: '/dashboard/users', icon: UserCog },
  { name: 'Auditoría', href: '/dashboard/audit', icon: ShieldAlert },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <aside className="w-72 bg-zinc-950/50 border-r border-white/10 flex-shrink-0 hidden md:flex flex-col h-screen fixed left-0 top-0 z-50 backdrop-blur-xl">
      {/* Header */}
      <div className="p-8 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-600 animate-pulse" />
          <h1 className="text-lg font-bold text-white tracking-tight">E-SYSTEM <span className="text-red-600">2026</span></h1>
        </div>
        <p className="text-xs text-zinc-500 font-medium mt-1 pl-5">Panel de Inteligencia Electoral</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto py-8">
        <p className="px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Menú Principal</p>
        {MENU_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`group flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border border-transparent ${
                isActive 
                  ? 'bg-red-600/10 text-red-500 border-red-600/20 shadow-[0_0_20px_rgba(220,38,38,0.1)]' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} className={isActive ? "text-red-500" : "text-zinc-500 group-hover:text-zinc-300"} />
                {item.name}
              </div>
              {isActive && <ChevronRight size={14} />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5 bg-zinc-900/20">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-left text-zinc-400 hover:text-red-400 hover:bg-red-950/10 rounded-xl text-sm transition-all"
        >
          <LogOut size={18} />
          Cerrar Sesión Segura
        </button>
      </div>
    </aside>
  );
}