import {checkToken,generateToken} from '../util/jwtGen.js'
import {hashPass,checkPass} from '../util/passHash.js'

class generalAuth{
    constructor(userRep){
        this.userRep=userRep
    }

    async login(userName,password){
        let user = await this.userRep.getUser(userName)
        console.log('Login - user from DB:', user);
        console.log('Login - user.id:', user?.id);
        console.log('Login - user.name:', user?.name);
        
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
    }

    async register(userName,password){
        if(await this.userRep.userExists(userName)){
            throw new Error(`User ${userName} already exists`);
        }
        const hashed = await hashPass(password);
        const res = await this.userRep.createUser(userName,hashed)
        return {success: true, message: "registered"};
    }
}

export {generalAuth}