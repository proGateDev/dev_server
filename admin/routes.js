const express = require("express");
const router = express.Router();
const adminProfileRoutes = require("./routes/profile");
const adminProfilesListRoutes = require("./routes/profiles");
const adminAuthRoutes = require("./routes/auth");



router.use("/profile", adminProfileRoutes);  
router.use("/auth", adminAuthRoutes);       
router.use("/profile-list", adminProfilesListRoutes);     

module.exports = router;
