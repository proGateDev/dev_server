const express = require("express");
const router = express.Router();
const controller = require("../controllers/profile");
const checkUserToken = require("../../middleware/jwt");
//==========================================


router.get("/", checkUserToken, controller.getAllAdminProfiles);    


module.exports = router;
