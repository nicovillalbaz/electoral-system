import { buildApp } from "./app";
import { env } from "./config/env";

async function main() {
  try {
    // 1. Construimos la app (carga plugins, cors, rutas)
    const app = await buildApp();

    // 2. Iniciamos el servidor
    // '0.0.0.0' es vital si usas Docker o quieres acceder desde la red local
    await app.listen({ 
      port: env.port || 3001, 
      host: "0.0.0.0" 
    });
    
    console.log(`🚀 Server running on http://localhost:${env.port || 3001}`);
    console.log(`🛡️  CORS allowed for PATCH, POST, GET, etc.`);

  } catch (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }
}

main();