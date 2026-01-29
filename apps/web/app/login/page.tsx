'use client';

import { useState, useEffect, Suspense, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '../../lib/api';

// Creamos un componente interno para usar useSearchParams (Next.js lo requiere dentro de Suspense)
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Si me mandan el ID por la URL (?c=CODIGO), lo pongo automático
    const cParam = searchParams.get('c');
    if (cParam) setCampaignId(cParam);
  }, [searchParams]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Usamos el ID que escribió el usuario o vino por URL
      const res = await api.post('/auth/login', { 
        email, 
        password, 
        campaignId 
      });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      const role = res.data.user.role;
      if (['OPERATOR', 'VOLUNTEER'].includes(role)) {
        router.push('/operator/checkin');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setError('Datos incorrectos. Verifica tu ID de campaña y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      {/* CAMPO NUEVO: ID DE CAMPAÑA */}
      <div>
        <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2 font-bold">
          ID de Campaña
        </label>
        <input 
          type="text" 
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          className="w-full bg-black border border-zinc-800 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-white focus:border-transparent outline-none transition-all font-mono text-sm text-zinc-300"
          placeholder="Ej: c30e7b67-..."
          required
        />
        <p className="text-[10px] text-zinc-600 mt-1">
          * Este código te lo da tu jefe de campaña.
        </p>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2 font-bold">
          Email
        </label>
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-black border border-zinc-800 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-white focus:border-transparent outline-none transition-all placeholder-zinc-700"
          placeholder="admin@sistema.com"
          required
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wider text-zinc-500 mb-2 font-bold">
          Contraseña
        </label>
        <input 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-black border border-zinc-800 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-white focus:border-transparent outline-none transition-all"
          placeholder="••••••••"
          required
        />
      </div>

      {error && (
        <div className="p-3 bg-red-950/30 border border-red-900/50 text-red-400 rounded-lg text-sm text-center font-bold animate-pulse">
          ⚠️ {error}
        </div>
      )}

      <button 
        type="submit" 
        disabled={loading}
        className="w-full bg-white text-black font-black py-4 rounded-lg text-lg uppercase tracking-widest hover:bg-zinc-200 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.1)]"
      >
        {loading ? 'Accediendo...' : 'Ingresar'}
      </button>
    </form>
  );
}

// Componente Principal que envuelve el formulario en Suspense
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black z-0"></div>
      
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 p-8 rounded-2xl shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="inline-block p-3 rounded-full bg-zinc-900 border border-zinc-800 mb-4 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Sistema Electoral</h1>
          <p className="text-zinc-500 text-sm mt-2 font-medium tracking-widest uppercase">Acceso Seguro Multi-Campaña</p>
        </div>
        
        <Suspense fallback={<div className="text-white text-center">Cargando formulario...</div>}>
          <LoginForm />
        </Suspense>
        
        <div className="mt-8 text-center border-t border-zinc-900 pt-6">
          <p className="text-zinc-700 text-xs">Sistema Privado v1.0 • SAAS Electoral</p>
        </div>
      </div>
    </div>
  );
}