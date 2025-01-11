const assignmentModel = require("../../model/assignment");
const trackingHistoryModel = require("../../model/trackingHistory");
const getAddressFromCoordinates = require("../../service/geoCode");
const userModel = require("../../user/models/profile");
const memberModel = require("../models/profile");
const superAdminCreationValidation = require("../validation/superAdminCreation")
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
//==================================================

module.exports = {

  getMemberProfile: async (req, res) => {
    try {
      const userId = req?.userId
      // console.log('========== userId =============>', userId);



      const userData = await memberModel.findOne({ _id: userId });

      if (!userData) {
        return res.status(404).json({ message: "User not found" });
      }

      const jsonResponse = {
        message: "User found successfully",
        member: userData,
      };

      res.status(200).json(jsonResponse);
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },


  updateMemberProfile: async (req, res) => {
    try {
      console.log('      user location updating ........');

      const userId = req.userId; // Get the user ID from the request (assuming it's available in the request object)
      const { name, email, mobile } = req.body; // Extract the fields to be updated from the request body

      // Prepare the update object
      const updateData = {};
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (mobile) updateData.mobile = mobile;

      // Update the user information
      const updatedUser = await memberModel.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true } // Return the updated user and run validators
      );

      if (!updatedUser) {
        return res.status(404).json({ message: "Member not found" });
      }

      res.status(200).json({ message: "User updated successfully", user: updatedUser });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Error updating user", error: error.message });
    }
  },





  // Update or create location history for a scheduled assignment
  userLiveLocationAssignmentUpdate: async (req, res) => {
    try {
      const memberId = req.userId; // Get the user ID from the request (assuming it's available in the request object)
      // console.log('userLiveLocationAssignmentUpdate ', memberId, req.userId);

      const {
        latitude,
        longitude,
        addressDetails,
        assignmentId,
        notes
      } = req.body;

      // if (!assignmentId || !memberId || !userId || !location || !location.coordinates) {
      //   return res.status(400).json({ error: 'Missing required fields' });
      // }

      // Ensure assignment exists
      // const assignment = await assignmentModel.findById(assignmentId);
      // if (!assignment) {
      //   return res.status(404).json({ error: 'Assignment not found' });
      // }

      // Ensure member exists
      const member = await memberModel.findById(memberId);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      // Ensure user exists
      // const user = await userModel.findById(userId);
      // if (!user) {
      //   return res.status(404).json({ error: 'User not found' });
      // }
      const location = {
        type: 'Point',
        coordinates: [latitude, longitude], // Ensure [longitude, latitude] order
      };

      // Create or update tracking history for the assignment
      const trackingData = {
        memberId,
        // userId,
        location,
        addressDetails: {
          preferredAddress: addressDetails?.preferredAddress || 'NOT FOUND',
          address: addressDetails?.address || 'NOT FOUND',
          locality: addressDetails?.locality || 'NOT FOUND',
          street: addressDetails?.street || 'NOT FOUND',
          neighborhood: addressDetails?.neighborhood || 'NOT FOUND',
          region: addressDetails?.region || 'NOT FOUND',
          district: addressDetails?.district || 'NOT FOUND',
          country: addressDetails?.country || 'NOT FOUND',
          postcode: addressDetails?.postcode || 'NOT FOUND',
          landmarks: addressDetails?.landmarks || [],
        },
        timestamp: new Date(),
        trackingType: 'scheduled',
        assignmentId,
        notes: notes || '',
        isWithinGeofence: false, // Default; update logic for geofence if applicable
      };

      // Save the tracking history
      const trackingHistory = new trackingHistoryModel(trackingData);
      await trackingHistory.save();

      res.status(201).json({
        message: 'Tracking history updated successfully',
        trackingHistory,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },


  userLiveLocationUpdate: async (req, res) => {
    try {
      const memberId = req.userId; // Get the user ID from the request (assuming it's available in the request object)

      const {
        latitude,
        longitude,
        addressDetails,
        notes
      } = req.body;

      // Ensure the member exists
      const member = await memberModel.findById(memberId);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      // Create the location object
      const location = {
        type: 'Point',
        coordinates: [latitude,longitude ], // Ensure [longitude, latitude] order
      };

      // Create or update tracking history for the live location
      const trackingData = {
        memberId,
        location,
        addressDetails: {
          preferredAddress: addressDetails?.preferredAddress || 'NOT FOUND',
          address: addressDetails?.address || 'NOT FOUND',
          locality: addressDetails?.locality || 'NOT FOUND',
          street: addressDetails?.street || 'NOT FOUND',
          neighborhood: addressDetails?.neighborhood || 'NOT FOUND',
          region: addressDetails?.region || 'NOT FOUND',
          district: addressDetails?.district || 'NOT FOUND',
          country: addressDetails?.country || 'NOT FOUND',
          postcode: addressDetails?.postcode || 'NOT FOUND',
          landmarks: addressDetails?.landmarks || [],
        },
        timestamp: new Date(),
        trackingType: 'live',
        notes: notes || '',
        isWithinGeofence: false, // Default; update logic for geofence if applicable
      };

      // Save the tracking history
      const trackingHistory = new trackingHistoryModel(trackingData);
      await trackingHistory.save();

      res.status(201).json({
        message: 'Live location updated successfully',
        trackingHistory,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },








};
