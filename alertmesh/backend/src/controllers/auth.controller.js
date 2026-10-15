
const { registerUser } = require("../services/auth.service");
const { registerSchema } = require("../validators/auth.validator");

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

module.exports = {
    register
};
