import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // En Next.js puro, verificar JWT es complejo en middleware Edge.
  // Por ahora, para Vibe Coding, hacemos una redirección básica si intenta entrar a dashboard sin cookie (si usaras cookies).
  // Si usas localStorage (como hicimos en login), el middleware no puede leerlo.
  
  // SOLUCIÓN PRÁCTICA (CLIENT SIDE):
  // Ya tienes el componente Sidebar.tsx que oculta el menú.
  // En apps/web/app/dashboard/layout.tsx, agrega un `useEffect` que lea el rol y redirija.
  return NextResponse.next();
}