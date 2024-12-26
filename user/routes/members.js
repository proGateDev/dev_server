const express = require("express");
const router = express.Router();
const controller = require("../controllers/members");
const checkUserToken = require("../../middleware/jwt");
const multer = require('multer');
const uploadData = require("../../middleware/upload");

//==========================================


router.post(
    "/",
    checkUserToken,
    uploadData.single('file'),
    controller.createUserMember
);
router.get("/list", checkUserToken, controller.getUserMembers);
router.get('/:memberId', checkUserToken, controller.getUserMemberById);
router.delete('/:memberId', controller.deleteUserMemberById);
router.get('/:memberId/daily-transit', controller.getUserMemberDailyTransit);
router.post('/activity-frequency', checkUserToken,controller.getUserMemberDailyTransitActivityFrequency);
router.post('/activity-frequency_', checkUserToken,controller.getUserMemberDailyTransitActivityFrequency_);


router.get("/attendance/today", checkUserToken, controller.getTodayAttendance_);
router.get("/attendance/records", checkUserToken, controller.getChannelMembersAttendance);
router.get("/attendance/records_new", checkUserToken, controller.getChannelMembersAttendance_new);


router.get("/daily-assignments/:channelId", checkUserToken, controller.getChannelMembersDailyAssignments);
router.post("/assignments-records/:channelId", checkUserToken, controller.getChannelMembersAssignmentsByDateRange);


module.exports = router;
