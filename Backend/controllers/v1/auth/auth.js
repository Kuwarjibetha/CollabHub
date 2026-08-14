const authService = require("../../../service/v1/auth");      // authService ko import kiya hai





// Signup Controller

async function signupController(req, res){
    try{
    const {name, email, password} = req.body;

    if(! name || !email || !password){      

        return res.status(400).json({success: false, message: "All fields are required"});
    }


    const user = await authService.signup({name, email, password}); // service func ko call kiya 

    return res.status(201).json({
        success: true,
        message: "Signup successful",
        data: user
    });
    } catch(err){
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong"
        });
    }
}




// Login controller

async function loginController(req,res){
    try{
        
        const {email, password} = req.body;

        if(!email || !password){
            return res.status(400).json({success: false, message: "Email required"});
        }


        const {user, token} = await authService.login({email, password}); // service func ko call kiya

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {user, token}
        })
    }catch(err){
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong"
        });
    }

}


module.exports = { signupController, loginController };