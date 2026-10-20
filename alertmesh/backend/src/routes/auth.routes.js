
const express = require("express");

const {
    register,
    login,
    getMe,
    refresh,
    logout
} = require("../controllers/auth.controller");

const { authenticateToken } = require("../middleware/auth.middleware");
const { validateLogin } = require("../middleware/validate-login.middleware");
const {
    loginLimiter,
    registerLimiter,
    refreshLimiter,
    logoutLimiter,
    accountLoginLimiter
} = require("../middleware/rate-limit.middleware");

const router = express.Router();

router.post("/register", registerLimiter, register);
// router.post("/login", loginLimiter, login);
router.post(
    "/login",
    loginLimiter,
    validateLogin,
    accountLoginLimiter,
    login
);

router.get("/me", authenticateToken, getMe);
router.post("/refresh", refreshLimiter, refresh);
router.post("/logout", logoutLimiter, logout);

module.exports = router;
