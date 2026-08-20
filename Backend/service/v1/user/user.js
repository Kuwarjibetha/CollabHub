const bcrypt = require("bcryptjs");
const { User } = require("../../../models");

// Get profile
async function getProfile(userId) {
  try {
    const user = await User.findByPk(userId);

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const { password: _, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  } catch (error) {
    throw error;
  }
}

// Update profile
async function updateProfile(userId, { name, profilePic }) {
  try {
    const user = await User.findByPk(userId);

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    if (name) user.name = name;
    if (profilePic) user.profilePic = profilePic;

    await user.save();

    const { password: _, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  } catch (error) {
    throw error;
  }
}

// Change password
async function changePassword(userId, { oldPassword, newPassword }) {
  try {
    const user = await User.findByPk(userId);

    if (!user) {
      const error = new Error("User not found");
      error.statusCode = 404;
      throw error;
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      const error = new Error("Old password is incorrect");
      error.statusCode = 401;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return { message: "Password changed successfully" };
  } catch (error) {
    throw error;
  }
}

module.exports = { getProfile, updateProfile, changePassword };