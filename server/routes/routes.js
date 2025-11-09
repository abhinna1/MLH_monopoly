const express = require("express");
const jwtCheck = require("../services/auth");
const User = require("../models/Users");
const router = express.Router();

// GET /api/example/health
router.get("/health", (req, res) => {
  res.json({ status: "ok", message: "API is running" });
});
// syllabus/parse

module.exports = router;
