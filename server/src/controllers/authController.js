const prisma = require("../config/prisma");

/*
|--------------------------------------------------------------------------
| Login
|--------------------------------------------------------------------------
*/
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.password_hash !== password) {
      return res.status(401).json({
        message: "Invalid password",
      });
    }

    res.json({
      message: "Login successful",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Logout
|--------------------------------------------------------------------------
*/
exports.logout = async (req, res) => {
  try {
    res.json({
      message: "Logout successful",
    });
  } catch (error) {
    res.status(500).json({
      message: "Logout failed",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| Reset Password
|--------------------------------------------------------------------------
*/
exports.resetPassword = async (req, res) => {
  try {
    const { email, new_password } = req.body;

    const user = await prisma.user.update({
      where: {
        email,
      },
      data: {
        password_hash: new_password,
      },
    });

    res.json({
      message: "Password reset successful",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Password reset failed",
      error: error.message,
    });
  }
};