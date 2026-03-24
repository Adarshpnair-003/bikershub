const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const clubController = require("../controllers/clubController");
const validate = require("../middleware/validate");
const { createClubSchema, nearbySchema } = require("../validators/clubValidator");

router.get("/nearby", validate(nearbySchema, "query"), clubController.getNearbyClubs);

router.post("/", protect, validate(createClubSchema), clubController.createClub);

router.post("/:clubId/join", protect, clubController.requestJoinClub);

router.get("/:clubId/requests", protect, clubController.getJoinRequests);

router.put("/:clubId/approve/:userId", protect, clubController.approveRequest);

router.put("/:clubId/reject/:userId", protect, clubController.rejectRequest);

router.put("/:clubId/leave", protect, clubController.leaveClub);

router.post("/:clubId/posts", protect, clubController.createClubPost);

router.get("/:clubId/posts", clubController.getClubPosts);

router.get("/:clubId", clubController.getClubDetails);

module.exports = router;
