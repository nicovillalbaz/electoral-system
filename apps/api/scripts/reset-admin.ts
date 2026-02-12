// ARCHIVO: apps/api/scripts/reset-admin.ts
import { hash } from 'bcryptjs'; // Usamos bcrypt directo para asegurar compatibilidad
import { query } from '../src/db/query'; // Asegúrate que esta ruta sea correcta

async function main() {
  const email = 'nico4villaz@gmail.com';
  const password = '123456';

  try {
    console.log(`🔒 Generando hash seguro para ${email}...`);
    // Usamos 10 salt rounds, que es el estándar de la industria
    const hashedPassword = await hash(password, 10);

    console.log('💾 Guardando en base de datos...');
    
    // CORRECCIÓN: Quitamos "updated_at = NOW()" que causaba el error
    const res = await query(
      `UPDATE users 
       SET password_hash = $1, 
           is_active = true, 
           deleted_at = NULL 
       WHERE email = $2
       RETURNING id`,
      [hashedPassword, email]
    );

    if (res.rowCount === 0) {
      console.error('❌ Error: No se encontró el usuario con ese email.');
    } else {
      console.log('✅ ¡Éxito! Contraseña restablecida a "123456".');
      console.log('   Ya puedes iniciar sesión.');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  }
}

main();