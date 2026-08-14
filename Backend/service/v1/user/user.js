const bcrypt = require('bcryptjs');
const { User } = require('../../../models');



// get profile
async function getProfile(userId){

    const user = await User.findByPk(userId); 

    if (!user){
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    const {password: _, ...userWithoutPassword} = user.toJSON();
    return userWithoutPassword;
}



// update profile
async function updateProfile(userId, {name, profilePic }){

    const user = await User.findByPk(userId);

    if(!user){
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }

    if(name) user.name = name;
    if(profilePic) user.profilePic = profilePic;

    await user.save();

    const {pssword: _, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
}



// change password
async function changePassword(userId, {oldPassword, newPassword}){

    const user = await User.findByPk(userId);

    if (!user){
        const error = new Error("User not found");
        error.statusCode = 404;
        throw error;
    }


    const isMatch = await bcrypt.compare(oldPassword, user.password);    // Compare old password because koi kisi kaa password change nahi kar sake 
    if (!isMatch){
        const error = new Error("Old password is incorrect");
        error.statusCode = 401;
        throw error;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return {message:"Password changed successfully"};


}


module.exports = { getProfile, updateProfile, changePassword };