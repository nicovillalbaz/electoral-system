'use client';
import { useState } from 'react';
import api from '../../../lib/api';
import { AlertTriangle, X, ShieldAlert, Ban, DollarSign, FileWarning } from 'lucide-react';

interface CrisisModalProps {
    onClose: () => void;
}

export default function CrisisModal({ onClose }: CrisisModalProps) {
    const [step, setStep] = useState<'SELECT' | 'DETAILS'>('SELECT');
    const [selectedType, setSelectedType] = useState('');
    const [description, setDescription] = useState('');
    const [severity, setSeverity] = useState('HIGH');
    const [sending, setSending] = useState(false);

    const TYPES = [
        { id: 'VIOLENCIA', label: 'Violencia / Amenaza', icon: <ShieldAlert size={24}/>, color: 'bg-red-500', severity: 'CRITICAL' },
        { id: 'IMPEDIMENTO', label: 'No dejan entrar/fiscalizar', icon: <Ban size={24}/>, color: 'bg-orange-500', severity: 'HIGH' },
        { id: 'LOGISTICA_CRITICA', label: 'Falta Dinero/Logística', icon: <DollarSign size={24}/>, color: 'bg-yellow-500', severity: 'HIGH' },
        { id: 'DOCUMENTACION', label: 'Problema Cédulas/Padron', icon: <FileWarning size={24}/>, color: 'bg-blue-500', severity: 'MEDIUM' },
    ];

    const handleSubmit = async () => {
        setSending(true);
        try {
            await api.post('/events/report', {
                type: selectedType,
                description: description,
                severity: severity
            });
            alert('🚨 REPORTE ENVIADO. El Puesto de Comando ha sido notificado.');
            onClose();
        } catch (e) {
            alert('Error al enviar reporte. Verifica tu conexión.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
            <div className="bg-zinc-900 border-2 border-red-500/50 w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                
                {/* Header */}
                <div className="bg-red-900/20 p-4 border-b border-red-500/30 flex justify-between items-center">
                    <h2 className="text-xl font-black text-red-500 flex items-center gap-2 uppercase tracking-wider">
                        <AlertTriangle className="animate-pulse" /> Reportar Incidente
                    </h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={24} /></button>
                </div>

                <div className="p-6">
                    {step === 'SELECT' && (
                        <div className="grid grid-cols-2 gap-4">
                            {TYPES.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => {
                                        setSelectedType(t.id);
                                        setSeverity(t.severity);
                                        setStep('DETAILS');
                                    }}
                                    className="aspect-square rounded-xl bg-zinc-800 border-2 border-zinc-700 hover:border-white hover:bg-zinc-700 transition-all flex flex-col items-center justify-center gap-3 p-2 text-center group"
                                >
                                    <div className={`${t.color} text-white p-3 rounded-full shadow-lg group-hover:scale-110 transition-transform`}>
                                        {t.icon}
                                    </div>
                                    <span className="font-bold text-white text-sm">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {step === 'DETAILS' && (
                        <div className="space-y-4">
                            <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                                <p className="text-xs text-zinc-500 uppercase font-bold mb-1">TIPO DE INCIDENTE</p>
                                <p className="text-lg font-bold text-white">{TYPES.find(t => t.id === selectedType)?.label}</p>
                            </div>

                            <div>
                                <label className="block text-zinc-400 text-sm font-bold mb-2">Detalles Adicionales (Opcional)</label>
                                <textarea 
                                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white h-32 focus:border-red-500 outline-none resize-none"
                                    placeholder="Describe brevemente qué está pasando..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>

                            <button 
                                onClick={handleSubmit}
                                disabled={sending}
                                className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-lg text-lg shadow-lg shadow-red-900/50 flex items-center justify-center gap-2"
                            >
                                {sending ? 'ENVIANDO...' : '🚨 ENVIAR ALERTA AHORA'}
                            </button>
                            
                            <button onClick={() => setStep('SELECT')} className="w-full py-2 text-zinc-500 text-sm hover:text-white">
                                Volver atrás
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
