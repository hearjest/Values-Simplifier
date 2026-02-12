import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

/**
 * @param {String} data
 */
function generateToken(data){
    return jwt.sign(data,process.env.JWT_SECRET,{expiresIn:"30Minutes"});
}
/**
 * @param {String} token 
 * 
 */
function checkToken(token){
    return jwt.verify(token, process.env.JWT_SECRET)
}

export {checkToken,generateToken}