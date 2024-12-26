const express = require("express");
const router = express.Router();
const controller = require("../controllers/subMembers");
const checkUserToken = require("../../middleware/jwt");
//==========================================

router.get("/", checkUserToken, controller.getMemberSubUsers);     // Read



module.exports = router;
