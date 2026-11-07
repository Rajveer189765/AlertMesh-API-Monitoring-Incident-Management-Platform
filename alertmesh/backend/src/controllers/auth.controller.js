const {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser
} = require("../services/auth.service");

const { registerSchema } = require("../validators/auth.validator");
const { loginSchema } = require("../validators/auth.validator");
const pool = require("../config/db");

const register = async (req, res) => {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid registration data",
            errors: validation.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message
            }))
        });
    }

    try {
        const user = await registerUser(validation.data);

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            user
        });
    } catch (error) {
        if (error.message === "Email already registered") {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }

        console.error("Registration error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};


// const login = async (req, res) => {
//     const validation = loginSchema.safeParse(req.body);

//     if (!validation.success) {
//         return res.status(400).json({
//             success: false,
//             message: "Invalid login data",
//             errors: validation.error.issues.map((issue) => ({
//                 field: issue.path.join("."),
//                 message: issue.message
//             }))
//         });
//     }

//     try {
//         // const result = await loginUser(validation.data);

//         // return res.status(200).json({
//         //     success: true,
//         //     message: "Login successful",
//         //     user: result.user,
//         //     accessToken: result.accessToken
//         // });

//         const result = await loginUser(validation.data);

//         res.cookie("refreshToken", result.refreshToken, {
//             httpOnly: true,
//             secure: process.env.NODE_ENV === "production",
//             sameSite: "lax",
//             maxAge: 7 * 24 * 60 * 60 * 1000,
//             path: "/api/auth"
//         });

//         return res.status(200).json({
//             success: true,
//             user: result.user,
//             accessToken: result.accessToken
//         });
//     } catch (error) {
//         if (error.message === "Invalid email or password") {
//             return res.status(401).json({
//                 success: false,
//                 message: "Invalid email or password"
//             });
//         }

//         console.error("Login error:", error);

//         return res.status(500).json({
//             success: false,
//             message: "Something went wrong"
//         });
//     }
// };

const login = async (req, res) => {
    try {
        const result = await loginUser(req.validatedLogin);

        res.cookie("refreshToken", result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/api/auth"
        });

        return res.status(200).json({
            success: true,
            user: result.user,
            accessToken: result.accessToken
        });
    } catch (error) {
        if (error.message === "Invalid email or password") {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};


const refresh = async (req, res) => {
    try {
        const result = await refreshAccessToken(
            req.cookies?.refreshToken
        );

        res.cookie("refreshToken", result.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/api/auth"
        });

        return res.status(200).json({
            success: true,
            accessToken: result.accessToken
        });
    } catch (error) {
        if (error.message === "Invalid refresh token") {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired refresh token"
            });
        }

        console.error("Refresh token error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};


const logout = async (req, res) => {
    try {
        await logoutUser(req.cookies?.refreshToken);

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/api/auth"
        });

        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (error) {
        console.error("Logout error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};


const getMe = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, name, email, created_at
             FROM users
             WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "User no longer exists"
            });
        }

        return res.status(200).json({
            success: true,
            user: result.rows[0]
        });
    } catch (error) {
        console.error("Get current user error:", error);

        return res.status(500).json({
            success: false,
            message: "Something went wrong"
        });
    }
};


module.exports = {
    register,
    login,
    getMe,
    refresh,
    logout
};
