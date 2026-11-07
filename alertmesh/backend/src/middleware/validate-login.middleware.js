const { loginSchema } = require("../validators/auth.validator");

const validateLogin = (req, res, next) => {
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

    req.validatedLogin = validation.data;
    next();
};

module.exports = { validateLogin };