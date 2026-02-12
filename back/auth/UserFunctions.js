import {hashPass,checkPass} from './passHash.js'
import {checkToken,generateToken} from './jwtGen.js'
import {getUser,isAUser,createUser} from '../db.js'
import dotenv from 'dotenv';
dotenv.config();

async function verifyToken(req,res,next){
    const token = req.cookies?.authToken;
    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }
    try {
        const decoded = checkToken(token);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid or expired token" });
    }
}

/**
 * 
 * 
 */
async function login(req,res,next){
    // check if user in db, redirect to reg if so
    // use checkPass to verify pass and get hashed from db
    // generate token
    let {userName,password} = req.body;
    let response = await getUser(userName,password);
    if(response!=null){
        console.log(response.id,response.name)
        let data={id:response.id,userName:response.name};
        let token = generateToken(data)
        req.token=token;
        next();
    }else{
        console.error("UserFunctions: Wrong login")
        res.status(401).json({message:"Invalid username or password"});
    }

}

async function reg(req,res,next){
    //check if user in db, redirect to login if so
    // hash pass, send to db
    // make token and automatically log them in
    let {userName,password} = req.body;
    if(!await isAUser(userName)){
        await createUser(userName,password)
        req.message="registered"
        next();
    }else{
        req.message="already a user"
        next();
    }
}

async function getUserData(req,res){
    //check token
    // get data
    const authHeader = req.headers.authorization || '';
    const [token] = authHeader.split(' ');
    if (!token) {
        return res.status(401).json({ message: 'Missing or invalid Authorization header' });
    }
}

export {reg,login,verifyToken}