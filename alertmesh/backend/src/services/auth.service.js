
const bcrypt = require("bcrypt");
const pool = require("../config/db");

const registerUser = async ({ name, email, password }) => {
    const existingUser = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
    );

    if (existingUser.rows.length > 0) {
        throw new Error("Email already registered");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    try {
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email, created_at`,
            [name, email, passwordHash]
        );

        return result.rows[0];
    } catch (error) {
        if (error.code === "23505") {
            throw new Error("Email already registered");
        }

        throw error;
    }
};

module.exports = {
    registerUser
};
