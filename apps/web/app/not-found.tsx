import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
      <h1 className="text-4xl font-bold mb-4 text-red-500">404 - Ruta no encontrada</h1>
      <p className="text-zinc-500 mb-8">Te has perdido en el territorio.</p>
      <Link 
        href="/login" 
        className="px-6 py-3 bg-white text-black font-bold rounded hover:bg-zinc-200 transition-colors"
      >
        Volver al Comando Central
      </Link>
    </div>
  );
}