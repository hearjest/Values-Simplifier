import {checkToken,generateToken} from '../util/jwtGen.js'
import {hashPass,checkPass} from '../util/passHash.js'
import {logger} from '../monitoring/logger.js'
const loggy=logger.child({Module:"userLogReg"})
class generalAuth{
    constructor(userRep){
        this.userRep=userRep
    }

    async login(userName,password){
        try{
            let user = await this.userRep.getUser(userName)
            if(!user){
                return null
            }
            const isValid = await checkPass(password, user.password)
            if(!isValid){
                return null
            }
            const tokenPayload = {id: user.id, userName: user.name};
            console.log('Login - creating token with payload:', tokenPayload);
            const token = generateToken(tokenPayload)
            return {result: user, token}
        }catch(error){
            loggy.error({userName:userName, function:"login",err:error},`Error logging in user ${userName}`)
        }
        
    }

    async register(userName,password){
        try{
            let result=await this.userRep.userExists(userName)
            if(result==true){
                return {success:false,message:"user already exists"}
            }
            const hashed = await hashPass(password);
            const res = await this.userRep.createUser(userName,hashed)
            return {success: true, message: "registered"};
        }catch(error){
            loggy.error({userName:userName, function:"register",err:error},`Error registering in user ${userName}`)
        }
    }
}

export {generalAuth}