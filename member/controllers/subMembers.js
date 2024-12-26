const memberModel = require("../models/profile");
const superAdminCreationValidation = require("../validation/superAdminCreation")
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
//==================================================

module.exports = {
  getMemberSubUsers: async (req, res) => {
    try {
      const memberId = req.userId; // Assuming you get memberId from the request parameters

      // Find the member and populate the parentUser field
      const memberData = await memberModel.findOne({ _id: memberId }).populate('parentUser');

      if (!memberData) {
        return res.status(404).json({ message: "Member not found" });
      }

      const { parentUser, groupType } = memberData;

      // Find colleagues based on parentUser and groupType
      const team = await memberModel.find({ parentUser: parentUser._id, groupType });

      res.status(200).json({
        message: "Team members retrieved successfully",
        team,
        count:team.length,
      });
    } catch (error) {
      console.error("Error fetching member colleagues:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },



};
