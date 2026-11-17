import pg from 'pg';

// A local Docker database is the default; no account or external database is required.
export const LOCAL_DATABASE_URL = 'postgresql://township:township_local@127.0.0.1:5432/township';

const globalDatabase = globalThis as typeof globalThis & { townshipPool?: pg.Pool };

export function getPool(): pg.Pool {
    if (!globalDatabase.townshipPool) {
        const connectionString = process.env.DATABASE_URL?.trim() || LOCAL_DATABASE_URL;
        const url = new URL(connectionString);
        if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
            throw new Error('DATABASE_URL must use the postgres or postgresql protocol.');
        }
        globalDatabase.townshipPool = new pg.Pool({
            connectionString,
            max: 5,
            connectionTimeoutMillis: 5000,
            idleTimeoutMillis: 10000,
            statement_timeout: 10000,
        });
        globalDatabase.townshipPool.on('error', (error) => {
            console.error('PostgreSQL pool error:', error.name);
        });
    }
    return globalDatabase.townshipPool;
}

export async function closePool() {
    const pool = globalDatabase.townshipPool;
    delete globalDatabase.townshipPool;
    await pool?.end();
}
