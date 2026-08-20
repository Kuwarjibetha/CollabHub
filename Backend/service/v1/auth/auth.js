const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User } = require("../../../models");

// Signup
async function signup({ name, email, password }) {
  try {
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      const error = new Error("Email already registered");
      error.statusCode = 409;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    const { password: _, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  } catch (error) {
    throw error;
  }
}

// Login
async function login({ email, password }) {
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      const error = new Error("Invalid email");
      error.statusCode = 401;
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const error = new Error("Invalid password");
      error.statusCode = 401;
      throw error;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const { password: _, ...userWithoutPassword } = user.toJSON();
    return { user: userWithoutPassword, token };
  } catch (error) {
    throw error;
  }
}

module.exports = { signup, login };