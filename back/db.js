import postgres from 'postgres'
import {hashPass,checkPass} from './auth/passHash.js'
const sql = postgres({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'bingbong',
    database: 'hi-postgres'
})

sql`SELECT version()`
  .then(result => {
    console.log('Postgres: Connected to:', result[0].version)
  })
  .catch(err => {
    console.error('Postgres: Connection failed:', err.message)
  })

 async function makeTable(){
     try{
    await sql`CREATE TABLE users (id SERIAL PRIMARY KEY,
name VARCHAR(100),
password VARCHAR(100),
token VARCHAR(1000),
token_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`
    console.log("mayybe made table")
  }catch(err){
    console.error("failed to make talbe")
  }
 }

 /**
  * @param {String} userName
  * @param {String} pass
  * 
  */
async function createUser(userName,pass){
  try{
    const hashed = await hashPass(pass)
    await sql`INSERT INTO users (name,password) VALUES(${userName},${hashed})`
  }catch(err){
    console.error(err)
  }
}


/**
 * @param {String} userNameEntered
 * @param {String} enteredPass
 */
async function getUser(userNameEntered,enteredPass){
  try{
    let rows = await sql`SELECT id, name, password FROM users WHERE name=${userNameEntered}`
    console.log(rows)
    if(rows.length === 0){
      return null;
    }

    let {id, name, password} = rows[0]
    console.log("hi")
    if(await checkPass(enteredPass,password)){
      return {id, name}
    }else{
      return null;
    }
  }catch(err){
    console.error("Error in getUser:", err)
    return null;
  }
}

/**
 * @param {String} userNameEntered
 */
async function isAUser(userNameEntered){
  try{
    let res = await sql`SELECT id, name FROM users WHERE name=${userNameEntered}`
    console.log(res);
    return res.length > 0;
  }catch(err){
    console.error("Error in isAUser:", err)
    return false;
  }
}



  export {getUser,isAUser,createUser}