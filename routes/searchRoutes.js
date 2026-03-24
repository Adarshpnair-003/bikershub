const express = require("express");
const router = express.Router();

const searchController = require("../controllers/searchController");
const { searchLimiter } = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");
const { searchSchema } = require("../validators/searchValidator");

router.get("/", searchLimiter, validate(searchSchema, "query"), searchController.globalSearch);

module.exports = router;
