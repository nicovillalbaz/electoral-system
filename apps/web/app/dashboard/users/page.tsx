'use client';
import { useState, useEffect } from 'react';
import api from '../../../lib/api';
import { UserCog, Shield, Plus, X, Lock } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  
  // Stations for assignment
  const [stations, setStations] = useState<any[]>([]);

  // Formulario nuevo/editar usuario
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    password: '',
    role: 'OPERATOR',
    operationalRole: 'OTRO',
    assignedStationId: '' // <--- New Field State for PC Assignment
  });

  useEffect(() => {
    loadUsers();
    loadStations();
  }, []);

  const loadStations = async () => {
      try {
          const res = await api.get('/stations');
          setStations(res.data);
      } catch (e) { console.error("Error loading stations", e); }
  }

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users'); 
      setUsers(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editMode && selectedUser) {
          // UPDATE
          const payload: any = {
              fullName: formData.fullName,
              role: formData.role,
              operationalRole: formData.operationalRole,
              assignedStationId: formData.assignedStationId || null
          };
          if (formData.password) payload.password = formData.password; // Only send if changed

          await api.patch(`/users/${selectedUser.id}`, payload);
      } else {
          // CREATE
          const payload: any = {
            email: formData.email,
            password: formData.password,
            fullName: formData.fullName,
            role: formData.role,
            operationalRole: formData.operationalRole,
          };
          await api.post('/users', payload);
      }
      
      setShowModal(false);
      loadUsers();
      resetForm();
    } catch (error) {
      alert("Error guardando usuario");
    }
  };

  const resetForm = () => {
      setFormData({ email: '', fullName: '', password: '', role: 'OPERATOR', operationalRole: 'OTRO', assignedStationId: '' });
      setEditMode(false);
      setSelectedUser(null);
  }

  const openEdit = (user: any) => {
      setSelectedUser(user);
      setFormData({
          email: user.email,
          fullName: user.full_name ?? user.fullName ?? '',
          password: '', // Always empty on edit
          role: user.role,
          operationalRole: user.operational_role || 'OTRO',
          assignedStationId: user.assigned_station_id || ''
      });
      setEditMode(true);
      setShowModal(true);
  }

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
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-white text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-zinc-200"
        >
          <Plus size={16} /> Nuevo Usuario
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => (
          <div 
            key={u.id} 
            onClick={() => openEdit(u)}
            className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col gap-4 group hover:border-zinc-600 transition-colors cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div className={`px-2 py-1 rounded text-[10px] font-black tracking-widest border ${ROLES[u.role]?.classes || 'bg-gray-800'}`}>
                {ROLES[u.role]?.label || u.role}
              </div>
              {u.operational_role && (
                <div className="px-2 py-1 rounded text-[10px] font-black tracking-widest border bg-purple-900/50 text-purple-200 border-purple-800">
                    {u.operational_role.replace('_', ' ')}
                </div>
              )}
              <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-white">{u.full_name || u.fullName}</h3>
              <p className="text-sm text-zinc-500 font-mono">{u.email}</p>
              {u.assigned_station_id && (
                  <div className="mt-2 text-[10px] bg-zinc-800 px-2 py-1 rounded w-fit text-zinc-300">
                      PC: {stations.find(s => s.id === u.assigned_station_id)?.name || 'PC Desconocido'}
                  </div>
              )}
            </div>

            <div className="mt-auto pt-4 border-t border-zinc-800/50 flex gap-2">
              <button className="flex-1 bg-zinc-950 py-2 rounded text-xs font-bold text-zinc-400 group-hover:bg-zinc-800 group-hover:text-white transition-colors flex justify-center gap-2">
                 EDITAR / VER
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
              <h2 className="text-xl font-bold text-white">{editMode ? 'Editar Usuario' : 'Alta de Operador'}</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white"><X /></button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">NOMBRE COMPLETO</label>
                <input 
                  className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-white outline-none" 
                  value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} required 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">EMAIL</label>
                <input 
                  type="email" className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-white outline-none disabled:opacity-50" 
                  value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required 
                  disabled={editMode} // Email cannot be changed usually
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">CONTRASEÑA {editMode && '(Dejar vacío para mantener)'}</label>
                <input 
                  type="password" className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-white outline-none" 
                  value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} 
                  required={!editMode}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">ROL DE SISTEMA</label>
                <select 
                  className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-white outline-none"
                  value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                >
                  <option value="OPERATOR">OPERADOR (Móvil)</option>
                  <option value="STATION_MANAGER">JEFE DE PC</option>
                  <option value="COORDINATOR">COORDINADOR (Zona)</option>
                  <option value="ADMIN">ADMINISTRADOR (Total)</option>
                  <option value="VOLUNTEER">VOLUNTARIO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">ROL OPERATIVO (Función Política)</label>
                <select 
                  className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-white outline-none"
                  value={formData.operationalRole} onChange={e => setFormData({...formData, operationalRole: e.target.value})}
                >
                  <option value="JEFE_CAMPAÑA">JEFE DE CAMPAÑA</option>
                  <option value="COORDINADOR">COORDINADOR</option>
                  <option value="PUNTERO">PUNTERO / LÍDER</option>
                  <option value="CHOFER">CHOFER</option>
                  <option value="MESA_TESTIGO">MESA TESTIGO</option>
                  <option value="OTRO">OTRO</option>
                </select>
              </div>
              
               <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">ASIGNAR A PUESTO (PC)</label>
                <select 
                  className="w-full bg-black border border-zinc-700 rounded p-3 text-white focus:border-white outline-none"
                  value={formData.assignedStationId} onChange={e => setFormData({...formData, assignedStationId: e.target.value})}
                >
                  <option value="">-- SIN ASIGNAR --</option>
                  {stations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.address || 'Sin dirección'})</option>)}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 font-bold text-zinc-400 hover:text-white">CANCELAR</button>
                <button type="submit" className="flex-1 bg-white text-black py-3 rounded font-black hover:bg-zinc-200">{editMode ? 'GUARDAR' : 'CREAR'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
