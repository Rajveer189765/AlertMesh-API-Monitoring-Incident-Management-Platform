
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

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


const createRefreshToken = async (userId) => {
    const refreshToken = crypto.randomBytes(64).toString("hex");

    const refreshTokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

    const expiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
    );

    await pool.query(
        `INSERT INTO auth_sessions
            (user_id, refresh_token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [userId, refreshTokenHash, expiresAt]
    );

    return refreshToken;
};


const loginUser = async ({ email, password }) => {
    const result = await pool.query(
        `SELECT id, name, email, password_hash
         FROM users
         WHERE email = $1`,
        [email]
    );

    const user = result.rows[0];

    if (!user || !user.password_hash) {
        throw new Error("Invalid email or password");
    }

    const passwordMatches = await bcrypt.compare(
        password,
        user.password_hash
    );

    if (!passwordMatches) {
        throw new Error("Invalid email or password");
    }

    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }

    const accessToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: "15m" }
    );

    const refreshToken = await createRefreshToken(user.id);

    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email
        },
        accessToken,
        refreshToken
    };
};



const refreshAccessToken = async (refreshToken) => {
    if (!refreshToken) {
        throw new Error("Invalid refresh token");
    }

    const refreshTokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `SELECT id, user_id
             FROM auth_sessions
             WHERE refresh_token_hash = $1
               AND expires_at > NOW()
               AND revoked_at IS NULL
             FOR UPDATE`,
            [refreshTokenHash]
        );

        const session = result.rows[0];

        if (!session) {
            throw new Error("Invalid refresh token");
        }

        await client.query(
            `UPDATE auth_sessions
             SET revoked_at = NOW()
             WHERE id = $1`,
            [session.id]
        );

        const newRefreshToken = crypto.randomBytes(64).toString("hex");

        const newRefreshTokenHash = crypto
            .createHash("sha256")
            .update(newRefreshToken)
            .digest("hex");

        const expiresAt = new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
        );

        await client.query(
            `INSERT INTO auth_sessions
                (user_id, refresh_token_hash, expires_at)
             VALUES ($1, $2, $3)`,
            [session.user_id, newRefreshTokenHash, expiresAt]
        );

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured");
        }

        const accessToken = jwt.sign(
            { userId: session.user_id },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );

        await client.query("COMMIT");

        return {
            accessToken,
            refreshToken: newRefreshToken
        };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};


const logoutUser = async (refreshToken) => {
    if (!refreshToken) {
        return;
    }

    const refreshTokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

    await pool.query(
        `UPDATE auth_sessions
         SET revoked_at = NOW()
         WHERE refresh_token_hash = $1
           AND revoked_at IS NULL`,
        [refreshTokenHash]
    );
};


module.exports = {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser
};