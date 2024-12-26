const express = require("express");
const router = express.Router();
const userAuthRoutes = require("./routes/auth");
const userMembersRoutes = require("./routes/members");
const userProfileRoutes = require("./routes/profile");
const userTrackRoutes = require("./routes/tracking");


router.use("/auth", userAuthRoutes);       
router.use("/profile", userProfileRoutes);       
router.use("/members",  userMembersRoutes);       
router.use("/track",  userTrackRoutes);       


module.exports = router;
