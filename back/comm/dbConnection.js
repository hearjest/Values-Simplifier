import postgres from 'postgres'
import dotenv from 'dotenv';
dotenv.config();
const sql = postgres({
    host: process.env.SQL_HOST,
    port: 5432,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASS,
    database: process.env.DBName
})

export {sql}