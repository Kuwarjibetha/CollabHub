const bcrypt = require('bcryptjs'); 
const jwt = require("jsonwebtoken"); // for token generation
const { User } = require("../../../models");


// Signup
async function signup({ name, email, password }) {
  const existingUser = await User.findOne({ where: { email } }); // check karo yeh email pehle se database me hai kya

  if (existingUser) {
    const error = new Error("Email already registerd");
    error.statusCode = 409; // 409 -> conflict (resource already exists)

    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10); // 10  means salt round, jitna zyada utna secure but slow

  const user = await User.create({   // create a new user 
    name,
    email,
    password : hashedPassword,   
  });

  const {password: _, ...userWithoutPassword} = user.toJSON(); // remove password from the response

  return userWithoutPassword;
}




// Login 
async function login({email, password}){

    const user = await User.findOne({where: {email}});    // Email Match
    if (!user){

        const error = new Error("Invalid email");
        error.statusCode = 401;
        throw error;
    }


    const isMatch = await bcrypt.compare(password, user.password);   // password Math
    if (!isMatch){
        
        const error = new Error ("Invalid Password");
        error.statusCode = 401;
        throw error;
    }


    const token = jwt.sign(      // JWT 
        {                        // payload -> token ke andar yeh data chupa rahega
            userId: user.id,
            role: user.role
        },
        process.env.JWT_SECRET,  
        { expiresIn: '7d' }       // 7 din baad token automatically invalid ho jayega

    );



    const {password: _, ...userWithoutPassword} = user.toJSON();  // Password hata ke response bhejo

    return {user: userWithoutPassword, token};  // dono cheez frontend ko chahiye


}



module.exports = { signup, login };