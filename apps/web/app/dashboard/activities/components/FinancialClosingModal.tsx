"use client";
import { useState } from "react";
import { X, DollarSign, Save, Loader2 } from "lucide-react";
import api from "../../../../lib/api";

interface FinancialClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task: any;
}

export default function FinancialClosingModal({ isOpen, onClose, onSuccess, task }: FinancialClosingModalProps) {
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !concept) return alert("Complete todos los campos");
    
    setLoading(true);
    try {
        await api.post(`/tasks/${task.id}/complete-financial`, {
            amount: Number(amount),
            concept
        });
        onSuccess();
        onClose();
        setAmount("");
        setConcept("");
    } catch (e) {
        alert("Error al registrar cierre financiero");
        // error handled by alert above
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-zinc-950 border border-yellow-500/30 w-full max-w-sm rounded-xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-600 to-orange-600" />
        
        <div className="flex justify-between items-center p-4 border-b border-zinc-800">
           <h2 className="text-lg font-black text-white flex items-center gap-2">
               <DollarSign className="text-yellow-500" size={20} />
               CIERRE FINANCIERO
           </h2>
           <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="bg-yellow-900/10 border border-yellow-500/20 p-3 rounded text-sm text-yellow-200 mb-4">
                Estás cerrando la tarea: <br/>
                <span className="font-bold text-white">{task.title}</span>
            </div>

            <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">MONTO ENTREGADO (Gs)</label>
                <input 
                    type="number" 
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 text-white text-lg font-mono outline-none focus:border-yellow-500 transition-colors"
                    placeholder="0"
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    autoFocus 
                    min={0}
                />
            </div>
            
            <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">CONCEPTO / DETALLE</label>
                <textarea 
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-3 text-white outline-none focus:border-yellow-500 h-24 resize-none transition-colors"
                    placeholder="Ej: Combustible para traslado de 3 personas..."
                    value={concept} 
                    onChange={e => setConcept(e.target.value)} 
                />
            </div>

            <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-extrabold py-3 rounded-lg flex justify-center items-center gap-2 transition-all"
            >
                {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                REGISTRAR Y CERRAR
            </button>
        </form>
      </div>
    </div>
  );
}
