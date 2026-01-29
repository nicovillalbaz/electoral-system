'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  MapPin, 
  ShieldAlert, 
  LogOut, 
  UserCog,
  Menu
} from 'lucide-react';

const MENU_ITEMS = [
  { name: 'Tablero Principal', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Padrón & Personas', href: '/dashboard/persons', icon: Users },
  { name: 'Puestos de Control', href: '/dashboard/stations', icon: MapPin },
  { name: 'Usuarios & Roles', href: '/dashboard/users', icon: UserCog },
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
    <aside className="w-64 bg-black border-r border-zinc-800 flex-shrink-0 hidden md:flex flex-col h-screen fixed left-0 top-0 z-50">
      <div className="p-6 border-b border-zinc-800">
        <h1 className="text-xl font-black text-white tracking-tighter">SISTEMA ELECTORAL</h1>
        <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Modo Comando</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {MENU_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-zinc-100 text-black shadow-lg shadow-white/10' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
              }`}
            >
              <item.icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-400 hover:bg-red-950/30 rounded-lg text-sm transition-colors"
        >
          <LogOut size={18} />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}