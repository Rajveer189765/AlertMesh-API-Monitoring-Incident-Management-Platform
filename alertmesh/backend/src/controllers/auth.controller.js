
const { registerUser, loginUser } = require("../services/auth.service");
const { registerSchema } = require("../validators/auth.validator");
const { loginSchema } = require("../validators/auth.validator");


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


const login = async (req, res) => {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
        return res.status(400).json({
            success: false,
            message: "Invalid login data",
            errors: validation.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message
            }))
        });
    }

    try {
        const result = await loginUser(validation.data);

        return res.status(200).json({
            success: true,
            message: "Login successful",
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


module.exports = {
    register,
    login
};
