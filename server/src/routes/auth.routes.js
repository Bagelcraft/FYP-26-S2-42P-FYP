const express = require('express');
const router = express.Router();


const {
  login,
  logout,
  resetPassword,
} = require("../controllers/authController");

router.post("/login", login);
router.post("/logout", logout);
router.post("/reset-password", resetPassword);


module.exports = router;
