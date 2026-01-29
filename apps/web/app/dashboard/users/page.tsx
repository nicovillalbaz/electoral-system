'use client';
import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { UserCog, Shield, Plus, X, Lock } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Formulario nuevo usuario
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'OPERATOR'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Asumimos que existe este endpoint. Si no, usa el repo que te di para users.routes
      const res = await api.get('/users'); 
      setUsers(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', newUser);
      setShowModal(false);
      loadUsers();
      setNewUser({ email: '', full_name: '', password: '', role: 'OPERATOR' }); // Reset
    } catch (error) {
      alert("Error creando usuario");
    }
  };

  // Mapeo de roles a colores y etiquetas
  const ROLES: any = {
    ADMIN: { label: 'ADMINISTRADOR', classes: 'bg-red-900/50 text-red-200 border-red-800' },
    COORDINATOR: { label: 'COORDINADOR', classes: 'bg-orange-900/50 text-orange-200 border-orange-800' },
    OPERATOR: { label: 'OPERADOR PUESTO', classes: 'bg-blue-900/50 text-blue-200 border-blue-800' },
    VOLUNTEER: { label: 'VOLUNTARIO', classes: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserCog className="text-zinc-500" /> Usuarios del Sistema
          </h1>
          <p className="text-zinc-500 text-sm">Gestiona permisos y accesos al centro de comando.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-zinc-200"
        >
          <Plus size={16} /> Nuevo Usuario
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => (
          <div key={u.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col gap-4 group hover:border-zinc-600 transition-colors">
            <div className="flex justify-between items-start">
              <div className={`px-2 py-1 rounded text-[10px] font-black tracking-widest border ${ROLES[u.role]?.classes || 'bg-gray-800'}`}>
                {ROLES[u.role]?.label || u.role}
              </div>
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-white">{u.full_name}</h3>
              <p className="text-sm text-zinc-500 font-mono">{u.email}</p>
            </div>

            <div className="mt-auto pt-4 border-t border-zinc-800/50 flex gap-2">
              <button className="flex-1 bg-zinc-950 py-2 rounded text-xs font-bold text-zinc-400 hover:text-white hover:bg-black transition-colors flex justify-center gap-2">
                <Lock size={14} /> RESET CLAVE
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL CREAR USUARIO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Alta de Operador</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white"><X /></button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">NOMBRE COMPLETO</label>
                <input 
                  className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-white outline-none" 
                  value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">EMAIL</label>
                <input 
                  type="email" className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-white outline-none" 
                  value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">CONTRASEÑA</label>
                <input 
                  type="password" className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-white outline-none" 
                  value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">ROL</label>
                <select 
                  className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-white outline-none"
                  value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="OPERATOR">OPERADOR (Móvil)</option>
                  <option value="COORDINATOR">COORDINADOR (Zona)</option>
                  <option value="ADMIN">ADMINISTRADOR (Total)</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 font-bold text-zinc-400 hover:text-white">CANCELAR</button>
                <button type="submit" className="flex-1 bg-white text-black py-3 rounded font-black hover:bg-zinc-200">CREAR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}