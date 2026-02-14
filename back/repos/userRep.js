class UserRepo{
    constructor(dbConnection){
        this.sql=dbConnection;
    }

    async createUser(userName,hashedPass){
        try{
            return await this.sql`INSERT INTO users (name,password) VALUES(${userName},${hashedPass})`
        }catch(err){
            console.error(err)
        }
    }

    async getUser(userNameEntered){
        let rows = await this.sql`SELECT id, name, password FROM users WHERE name=${userNameEntered}`
        console.log('UserRepo.getUser - rows:', rows);
        console.log('UserRepo.getUser - rows[0]:', rows[0]);
        return rows[0]||null
    }

    async userExists(userName){
        let rows = await this.sql`SELECT id, name FROM users WHERE name=${userName}`
        return rows.length > 0;
    }
}

export {UserRepo}