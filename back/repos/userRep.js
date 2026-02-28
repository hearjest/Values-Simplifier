class UserRepo{
    constructor(dbConnection){
        this.sql=dbConnection;
    }

    async createUser(userName,hashedPass){
        try{
            return await this.sql`INSERT INTO users (name,password) VALUES(${userName},${hashedPass})`
        }catch(err){
            throw err
        }
    }

    async getUser(userNameEntered){
        try{
            let rows = await this.sql`SELECT id, name, password FROM users WHERE name=${userNameEntered}`
            return rows[0]||null
        }catch(error){
            throw error
        }
        
    }

    async userExists(userName){
        try{
            let rows = await this.sql`SELECT id, name FROM users WHERE name=${userName}`
            return rows.length > 0;
        }catch(error){
            throw error
        }
        
    }
}

export {UserRepo}