import { useState, useEffect } from 'react';
import { Bell, Check, Trash } from 'lucide-react';
import api from '../../../lib/api';
import { useRouter } from 'next/navigation';

export default function Header() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const router = useRouter();
    
    const fetchNotifs = async () => {
        try {
            const res = await api.get('/notifications/unread');
            setNotifications(res.data);
            setUnreadCount(res.data.length);
        } catch(e) {}
    };

    useEffect(() => {
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const markRead = async (id: string, link?: string) => {
        try {
            await api.patch(`/notifications/${id}/read`, {});
            fetchNotifs();
            if (link) router.push(link);
            setShowDropdown(false);
        } catch(e) {}
    }

    const markAllRead = async () => {
        try {
            // Optimistic update
            setNotifications([]);
            setUnreadCount(0);
            
            // Call API for each (Improvement: Add Bulk Mark Read Endpoint later)
            await Promise.all(notifications.map(n => api.patch(`/notifications/${n.id}/read`, {})));
            fetchNotifs();
        } catch(e) {}
    }

    return (
        <div className="flex justify-end items-center mb-0">
            <div className="relative">
                <button onClick={() => setShowDropdown(!showDropdown)} className="relative p-2 text-zinc-400 hover:text-white transition-colors bg-zinc-900/50 rounded-full border border-zinc-800/50 hover:bg-zinc-800">
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-600 text-white text-[9px] font-bold flex items-center justify-center rounded-full border border-zinc-950 animate-pulse">
                            {unreadCount}
                        </span>
                    )}
                </button>

                {showDropdown && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)}/>
                        <div className="absolute right-0 mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                            <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2"><Bell size={12}/> Notificaciones</h3>
                                {unreadCount > 0 && <button onClick={markAllRead} className="text-[10px] text-blue-400 hover:text-white font-bold hover:underline">MARCAR LEÍDAS</button>}
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center text-zinc-600 text-xs italic">
                                        <div className="mx-auto w-8 h-8 rounded-full bg-zinc-800/50 flex items-center justify-center mb-2"><Check size={14} className="opacity-50"/></div>
                                        Estás al día.
                                    </div>
                                ) : (
                                    notifications.map(n => (
                                        <div key={n.id} onClick={() => markRead(n.id, n.link)} className="p-3 hover:bg-zinc-800 border-b border-zinc-800/50 cursor-pointer transition-colors group">
                                            <div className="flex gap-3">
                                                <div className="mt-1 h-2 w-2 rounded-full bg-blue-500 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                                                <div>
                                                    <p className="text-sm text-zinc-200 mb-1 leading-snug">{n.message}</p>
                                                    <p className="text-[10px] text-zinc-500 font-mono">{new Date(n.created_at).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
