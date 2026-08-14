const jwt = require("jsonwebtoken") // for token generation


// verify the token
function verifyToken(req,res,next){

    const authHeader = req.headers.authorization;   // header se authorization value nikalo 
    if (!authHeader || !authHeader.startsWith("Bearer ")){   // 

        return res.status(401).json({success:false, message:"No token provided"})
    }


    const token = authHeader.split(" ")[1]; // Bearer ko hata ke sirf actual token


    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // token verify karo ki jwt secreat wahi hai jo sign karte time use hua tha
        req.user = decoded; 

        next();
    }catch(err){

        return res.status(401).json({success:false, message:"Invalid or expired token"});
    }

}




module.exports = { verifyToken };