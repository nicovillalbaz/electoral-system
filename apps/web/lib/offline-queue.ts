
import api from "./api";

// Queue Item Structure
type QueueItem = {
  id: string; // unique ID
  url: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  data: any;
  timestamp: number;
  retryCount: number;
};

const QUEUE_KEY = "offline_mutation_queue";

// 1. Add to Queue
export function addToQueue(url: string, method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', data: any) {
  const queue = getQueue();
  const item: QueueItem = {
    id: crypto.randomUUID(),
    url,
    method,
    data,
    timestamp: Date.now(),
    retryCount: 0
  };
  queue.push(item);
  saveQueue(queue);
  
  // Try to process immediately if online
  if (navigator.onLine) {
    processQueue();
  }
}

// 2. Get Queue
function getQueue(): QueueItem[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(QUEUE_KEY);
  return stored ? JSON.parse(stored) : [];
}

// 3. Save Queue
function saveQueue(queue: QueueItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

// 4. Process Queue (The "Sync" mechanism)
export async function processQueue() {
  if (typeof window === "undefined" || !navigator.onLine) return;

  const queue = getQueue();
  if (queue.length === 0) return;

  const remainingQueue: QueueItem[] = [];

  for (const item of queue) {
    try {
      if (item.method === 'POST') await api.post(item.url, item.data);
      if (item.method === 'PUT') await api.put(item.url, item.data);
      if (item.method === 'PATCH') await api.patch(item.url, item.data);
      if (item.method === 'DELETE') await api.delete(item.url, { data: item.data });
      
      // Success! Item is NOT added to remainingQueue
      console.log(`[OfflineQueue] Synced ${item.url}`);
    } catch (error: any) {
      const status = error.response?.status;
      
      // 1. Error Fatal (4xx): Datos inválidos, no autenticado, no encontrado.
      // NO reintentar. Eliminar de la cola.
      if (status && status >= 400 && status < 500) {
          console.error(`[OfflineQueue] 🛑 DISCARDING fatal error ${item.url} (Status ${status})`);
          
          if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('offline-error', { 
                  detail: { message: `Error al sincronizar (Descartado): ${status}` } 
              }));
          }
          // continue loop, do NOT push to remainingQueue
          continue; 
      }

      // 2. Error Recuperable (5xx, Network Error)
      console.error(`[OfflineQueue] ⚠️ Keeping in queue ${item.url}`, error);
      item.retryCount++;
      if (item.retryCount < 50) {
          remainingQueue.push(item); 
      }
    }
  }

  saveQueue(remainingQueue);
}

// Initialize listener
if (typeof window !== "undefined") {
  window.addEventListener('online', processQueue);
  // Also try on load
  processQueue();
}
