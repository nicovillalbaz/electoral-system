import { buildApp } from "./app";
import { env } from "./config/env";

async function main() {
  // 1. Aquí está el cambio clave: agregamos 'await'
  const app = await buildApp();

  try {
    // 2. Iniciamos el servidor
    await app.listen({ 
      port: env.port || 3001, 
      host: "0.0.0.0" // Importante para que funcione en Docker/Railway luego
    });
    
    console.log(`🚀 Server running on http://localhost:${env.port || 3001}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();