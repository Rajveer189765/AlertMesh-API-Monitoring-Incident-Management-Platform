const express = require("express");
const cors = require("cors");
const pool = require("./config/db");
const app = express();
const authRoutes = require("./routes/auth.routes");

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "AlertMesh API is running"
    });
});

app.get("/api/health/db", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            success: true,
            message: "Database connection successful",
            time: result.rows[0].now
        });
    } catch (error) {
        console.error("Database connection failed:", error);

        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
});

module.exports = app;