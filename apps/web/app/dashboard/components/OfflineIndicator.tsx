'use client';
import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';

export default function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(true);
    const [pendingCount, setPendingCount] = useState(0);
    const [hasSyncErrors, setHasSyncErrors] = useState(false);

    const [toastMsg, setToastMsg] = useState<string | null>(null);

    const checkQueue = () => {
        if (typeof window === "undefined") return;
        const q = localStorage.getItem("offline_mutation_queue");
        if (q) {
            try {
                const parsed = JSON.parse(q);
                setPendingCount(parsed.length);
                // Si algún ítem ya falló 1 vez, es un error de sync
                setHasSyncErrors(parsed.some((i: any) => i.retryCount > 0));
            } catch (e) {
                setPendingCount(0);
            }
        } else {
            setPendingCount(0);
        }
    };

    useEffect(() => {
        // Set initial state
        setIsOnline(navigator.onLine);

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        const handleSyncError = (e: any) => {
             const msg = e.detail?.message || "Error al sincronizar";
             setToastMsg(msg);
             setTimeout(() => setToastMsg(null), 5000); // 5 sec toast
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('offline-error', handleSyncError);
        
        // Poll queue size purely for UI indication
        const interval = setInterval(checkQueue, 2000);
        checkQueue();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('offline-error', handleSyncError);
            clearInterval(interval);
        };
    }, []);

    // Priority 0: Fatal Sync Error Toast (Temporary)
    if (toastMsg) {
        return (
             <div className="fixed top-0 left-0 w-full z-[101] text-center text-xs font-bold py-2 px-4 flex items-center justify-center gap-2 bg-red-900/95 text-white shadow-xl transition-transform border-b border-red-500">
                <AlertTriangle size={16} className="text-red-400" /> 
                <span className="font-mono">{toastMsg}</span>
            </div>
        );
    }

    if (isOnline && pendingCount === 0) return null;

    // Estado 1: Offline (Rojo)
    if (!isOnline) {
        return (
            <div className="fixed top-0 left-0 w-full z-[100] text-center text-xs font-bold py-1 px-4 flex items-center justify-center gap-2 bg-red-600 text-white transition-transform">
                <WifiOff size={14} /> MODO OFFLINE ACTIVADO - {pendingCount} cambios guardados localmente.
            </div>
        );
    }

    // Estado 2: Online pero con Errores de Sync (Rojo Alerta)
    if (hasSyncErrors) {
        return (
            <div className="fixed top-0 left-0 w-full z-[100] text-center text-xs font-bold py-1 px-4 flex items-center justify-center gap-2 bg-red-700 text-white animate-pulse transition-transform">
                 <AlertTriangle size={14} /> ERROR DE SINCRONIZACIÓN - Reintentando {pendingCount} pendientes...
            </div>
        );
    }

    // Estado 3: Online Sincronizando (Naranja)
    return (
        <div className="fixed top-0 left-0 w-full z-[100] text-center text-xs font-bold py-1 px-4 flex items-center justify-center gap-2 bg-orange-500 text-black transition-transform">
            <RefreshCw size={14} className="animate-spin" /> Sincronizando {pendingCount} cambios pendientes...
        </div>
    );
}
