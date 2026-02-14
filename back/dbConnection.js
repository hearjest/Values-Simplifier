import postgres from 'postgres'
const sql = postgres({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'bingbong',
    database: 'hi-postgres'
})

export {sql}