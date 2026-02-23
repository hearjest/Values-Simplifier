import postgres from 'postgres'
import dotenv from 'dotenv';
dotenv.config();
const sql = (()=>{
    try{
        return postgres({
            host: process.env.SQL_HOST,
            port: 5432,
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.POSTGRES_DB
        })
    }catch(error){
        console.error(error);
        console.log("Failed to connect to postgre")
    }
})();

export {sql}