const express = require('express');
const router = express.Router();
const trackController = require('../controller/assignment');
const checkUserToken = require("../middleware/jwt");

router.post('/location',checkUserToken, trackController.assignment);
// router.get('/location', checkUserToken,trackController.getAssignment);






router.get('/member/:startDate/:endDate', checkUserToken,trackController.getMemberAssignments);





router.patch('/location', checkUserToken,trackController.patchAssignment);
router.patch('/member', checkUserToken,trackController.patchAssignment);

module.exports = router;
