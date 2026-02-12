import bcrypt from "bcryptjs";

/**
 * @param {String} pass
 */
async function hashPass(pass){
    return await bcrypt.hash(pass,12);
}

/**
 * @param {String} enteredPass 
 * @param {String} hashedTrue 
 */
async function checkPass(enteredPass,hashedTrue){
    let result = await bcrypt.compare(enteredPass,hashedTrue)
    console.log("result",result)
    return result
}

export {hashPass,checkPass}