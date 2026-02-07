import { query } from './src/db/query';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
    try {
        const sqlPath = "d:\\Users\\Nicolás Antonio\\electoral-system\\station_dashboard.sql";
        console.log(`Reading SQL from ${sqlPath}...`);
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('Executing SQL...');
        await query(sql);
        
        console.log('Migration successful!');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

run();
