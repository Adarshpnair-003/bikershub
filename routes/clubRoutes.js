const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");

const clubController = require("../controllers/clubController");

router.post("/", protect, clubController.createClub);

router.post("/:id/join", protect, clubController.requestJoinClub);

router.get("/:id/requests", protect, clubController.getJoinRequests);

router.put("/approve/:clubId/:userId", protect, clubController.approveRequest);

router.put("/reject/:clubId/:userId", protect, clubController.rejectRequest);

router.put("/leave/:clubId", protect, clubController.leaveClub);

router.post("/:clubId/post", protect, clubController.createClubPost);

router.get("/:clubId/posts", clubController.getClubPosts);

router.get("/:clubId", clubController.getClubDetails);

module.exports = router;