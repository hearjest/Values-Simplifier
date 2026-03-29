class UserRepo{
    constructor(dbConnection){
        this.sql=dbConnection;
    }

    async createUser(userName,hashedPass){
        return await this.sql`INSERT INTO users (name,password) VALUES(${userName},${hashedPass})`
    }

    async getUser(userNameEntered){
        let rows = await this.sql`SELECT id, name, password FROM users WHERE name=${userNameEntered}`
        return rows[0]||null
    }

    async userExists(userName){
        let rows = await this.sql`SELECT id, name FROM users WHERE name=${userName}`
        return rows.length > 0;
    }
}

export {UserRepo}