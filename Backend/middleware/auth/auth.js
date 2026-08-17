const jwt = require("jsonwebtoken") // for token generation
const { User } = require("../../models");


// verify the token
async function verifyToken(req,res,next){

    const authHeader = req.headers.authorization;   // header se authorization value nikalo 
    if (!authHeader || !authHeader.startsWith("Bearer ")){   // 

        return res.status(401).json({success:false, message:"No token provided"})
    }


    const token = authHeader.split(" ")[1]; // Bearer ko hata ke sirf actual token


    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // token verify karo ki jwt secreat wahi hai jo sign karte time use hua tha
        const user = await User.findByPk(decoded.userId, { attributes: ["id", "isBlocked", "role"] });
        if (!user || user.isBlocked) return res.status(403).json({success:false, message:"This account is blocked"});
        req.user = { ...decoded, role: user.role };

        next();
    }catch(err){

        return res.status(401).json({success:false, message:"Invalid or expired token"});
    }

}




module.exports = { verifyToken };
