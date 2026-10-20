
const { rateLimit } = require("express-rate-limit");

// Shared default response for rate-limited requests.
const rateLimitResponse = {
    success: false,
    message: "Too many requests. Please try again later."
};

// Login: limit repeated authentication attempts from one IP.
const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: rateLimitResponse
});

// Registration: reduce automated account creation.
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: rateLimitResponse
});

// Refresh: limit repeated refresh-token submissions.
const refreshLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: rateLimitResponse
});

// Logout: prevent excessive repeated requests.
const logoutLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: rateLimitResponse
});

// Account-based login protection.
// Uses the normalized email produced by validateLogin middleware.
const accountLoginLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    keyGenerator: (req) => `account:${req.validatedLogin.email}`,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: rateLimitResponse,
    skip: (req) => !req.validatedLogin?.email
});

module.exports = {
    loginLimiter,
    registerLimiter,
    refreshLimiter,
    logoutLimiter,
    accountLoginLimiter
};
