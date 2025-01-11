const express = require("express");
const router = express.Router();
const controller = require("../controllers/tracking");
const checkUserToken = require("../../middleware/jwt");
//==========================================


router.put("/",checkUserToken, controller.updateMemberLocation); 
router.post("/records",checkUserToken, controller.postMemberLocation); 
router.get("/records",checkUserToken, controller.getMemberLocations); 

router.get("/records",checkUserToken, controller.getMemberLocations); 



module.exports = router;

