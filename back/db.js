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
/**
 * @param {Integer} uid
 * @param {Integer} id
 * @param {String} jobPath
 */
async function addJob(uid,id,jobPath){
  try{
    let res = await sql`INSERT INTO jobs (id,user_id,status,original_path) VALUES(${uid},${id},${"queued"},${jobPath})`
    console.log(res);
    return res.length > 0;
  }catch(err){
    console.error("Error in isAUser:", err)
    return false;
  }
}
/**
 * @param {String} original_Path
 * @param {String} processed_Path
 */
async function updateJob(original_Path,processed_Path){
  try{
    let res = await sql`UPDATE jobs SET status=${'complete'}, processed_path=${processed_Path}, finished_at=now() WHERE original_path=${original_Path}`
    console.log(res);
    return res.length > 0;
  }catch(err){
    console.error("Error in isAUser:", err)
    return false;
  }
}


  export {getUser,isAUser,createUser,addJob,updateJob}