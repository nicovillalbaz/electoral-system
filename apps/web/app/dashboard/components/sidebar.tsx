'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, List, BarChart3,
  MapPin, 
  ShieldAlert, 
  Siren, 
  LogOut, 
  UserCog,
  ChevronRight,
  ChevronLeft,
  Menu,
  CalendarDays,
  X
} from 'lucide-react';
import { clsx } from 'clsx';

const MENU_ITEMS = [
  { name: 'Tablero de Comando', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Actividades', href: '/dashboard/activities', icon: CalendarDays }, // New Link
  { name: 'Padrón & Votantes', href: '/dashboard/persons', icon: Users },
  { name: 'Listas Inteligentes', icon: List, href: '/dashboard/lists' },
  { name: 'Control Día D', href: '/dashboard/voting', icon: Siren, className: 'text-emerald-500' }, // Destacado en Rojo
  { name: 'Centro de Batalla', href: '/dashboard/control', icon: ShieldAlert },
  { name: 'Puestos (PC)', href: '/dashboard/stations', icon: MapPin },
  { name: 'Equipo & Accesos', href: '/dashboard/users', icon: UserCog },
  { name: 'Auditoría', href: '/dashboard/audit', icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Auto-collapse on small screens if window resize happens (optional optimization)
  useEffect(() => {
    const handleResize = () => {
        if (window.innerWidth < 1024) {
            setIsCollapsed(true); // Default to collapsed on tablet-ish
        } else {
            setIsCollapsed(false);
        }
    };
    // window.addEventListener('resize', handleResize);
    // return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);
  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);

  return (
    <>
      {/* Mobile Trigger */}
      <div className="fixed top-4 left-4 z-[60] md:hidden">
        <button 
            onClick={toggleMobile}
            className="p-2 bg-zinc-900 text-white rounded-lg border border-zinc-800 shadow-xl"
        >
            {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Backdrop for Mobile */}
      {isMobileOpen && (
        <div 
            className="fixed inset-0 bg-black/80 z-[55] md:hidden backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={clsx(
            "fixed left-0 top-0 h-screen bg-zinc-950/90 border-r border-white/5 flex flex-col z-[50] transition-all duration-300 backdrop-blur-xl",
            isCollapsed ? "w-20" : "w-72",
            isMobileOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Header */}
        <div className={clsx("flex items-center gap-3 p-6 border-b border-white/5", isCollapsed && "justify-center px-2")}>
            <div className="h-8 w-8 rounded-lg bg-red-600 flex items-center justify-center flex-shrink-0 animate-pulse">
                <ShieldAlert className="text-white" size={18} />
            </div>
            {!isCollapsed && (
                <div>
                    <h1 className="text-lg font-bold text-white tracking-tight leading-none">E-SYSTEM <span className="text-red-600">2026</span></h1>
                    <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mt-1">Inteligencia Electoral</p>
                </div>
            )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden py-6">
            {!isCollapsed && <p className="px-3 text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-2">Menú Principal</p>}
            
            {MENU_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
                <Link 
                key={item.href} 
                href={item.href}
                onClick={() => setIsMobileOpen(false)} // Close on navigate (mobile)
                className={clsx(
                    "group flex items-center rounded-xl text-sm font-medium transition-all duration-200 border border-transparent",
                    isCollapsed ? "justify-center p-3" : "justify-between px-4 py-3",
                    isActive 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900/80'
                )}
                title={isCollapsed ? item.name : undefined}
                >
                <div className="flex items-center gap-3">
                    <item.icon size={20} className={isActive ? "text-emerald-500" : "text-zinc-500 group-hover:text-zinc-300"} />
                    {!isCollapsed && <span>{item.name}</span>}
                </div>
                {!isCollapsed && isActive && <ChevronRight size={14} className="opacity-50" />}
                </Link>
            );
            })}
        </nav>

        {/* Footer / Toggle */}
        <div className="p-4 border-t border-white/5 bg-zinc-900/30">
            <button 
                onClick={handleLogout}
                className={clsx(
                    "flex items-center rounded-xl text-sm transition-all text-zinc-400 hover:text-emerald-400 hover:bg-emerald-950/10",
                    isCollapsed ? "justify-center p-3" : "gap-3 px-4 py-3 w-full"
                )}
                title="Cerrar Sesión"
            >
                <LogOut size={20} />
                {!isCollapsed && <span>Cerrar Sesión</span>}
            </button>
            
            {/* Desktop Collapse Toggle */}
            <button 
                onClick={toggleCollapse}
                className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 bg-zinc-800 border border-zinc-700 rounded-full p-1 text-zinc-400 hover:text-white shadow-lg z-50 hover:scale-110 transition-transform"
            >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
        </div>
      </aside>
    </>
  );
}
