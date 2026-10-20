const { z } = require("zod");

const registerSchema = z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(255).transform(
        (email) => email.toLowerCase()
    ),
    password: z.string().min(8).max(72)
});

//minimum password length is different for both register and login. while registering for the first time, we enforce the user to enter a password  that is of atleast length=8. Then during login, the user can enter any non empty string of password, we just then need to match that passwrod with the hashed password. And hence, there is no restriction on password length<8 during login

const loginSchema = z.object({
    email: z.string().trim().email().max(255).transform(
        (email) => email.toLowerCase()
    ),
    password: z.string().min(1).max(72)
});


module.exports = {
    registerSchema,
    loginSchema
};