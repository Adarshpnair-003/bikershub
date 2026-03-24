const express = require("express");
const router = express.Router();
const { query } = require("express-validator");

const searchController = require("../controllers/searchController");
const validateRequest = require("../middleware/validateRequest");

router.get(
	"/",
	[query("q").trim().notEmpty().withMessage("Search query required")],
	validateRequest,
	searchController.globalSearch
);

module.exports = router;