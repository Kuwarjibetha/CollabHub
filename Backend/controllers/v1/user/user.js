const userService = require("../../../service/v1/user");

async function getProfileController(req, res) {
    try {

        const user = await userService.getProfile(req.user.userId);

        return res.status(200).json({
            success: true,
            message: "Profile fetched",
            data: user,
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }
}


async function updateProfileController(req, res) {
    try {

        const { name, profilePic } = req.body;

        const updatedUser = await userService.updateProfile(req.user.userId, { name, profilePic });

        return res.status(200).json({
            success: true,
            message: "Profile updated",
            data: updatedUser,
        });
    } catch (err) {

        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "something went wrong",
        });
    }
}



async function changePasswordController(req, res) {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Both passwords are required' });
        }

        const result = await userService.changePassword(req.user.userId, { oldPassword, newPassword });
        return res.status(200).json({
            success: true,
            message: result.message,
        });
    } catch (err) {
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || "Something went wrong",
        });
    }

}



async function uploadProfilePicController(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }


        const profilePicPath = req.file.path;   // 

        const updatedUser = await userService.updateProfile(req.user.userId, { profilePic: profilePicPath });

        return res.status(200).json({
            success: true,
            message: "Profile picture uploaded",
            data: updatedUser,
        });


    }catch (err) {
        return res.status(err.statusCode || 500).json({
            success: false,
            message: err.message || 'Something went wrong',
        });
    }
}




module.exports = { getProfileController, updateProfileController, changePasswordController, uploadProfilePicController };