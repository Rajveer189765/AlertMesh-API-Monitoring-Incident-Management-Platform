const express = require("express");

const { authenticateToken } = require("../middleware/auth.middleware");
const { create, getAll, getById, update, remove } = require("../controllers/monitor.controller");
const router = express.Router();

// All monitor routes require authentication.
router.use(authenticateToken);

// Create a monitor.
router.post("/", create);
router.get("/", getAll);
router.get("/:monitorId", getById);
router.patch("/:monitorId", update);
router.delete("/:monitorId", remove);

module.exports = router;