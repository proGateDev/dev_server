const memberModel = require("../models/profile");
const userModel = require("../../user/models/profile");
const superAdminCreationValidation = require("../validation/superAdminCreation")
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
//==================================================

module.exports = {
  fetchMemberParent: async (req, res) => {
    try {
      const memberId = req.userId; // Assuming you get memberId from the request parameters

      // Find the member and populate the parentUser field
      const memberParentData = await memberModel.findOne({ _id: memberId }).populate('parentUser');

      if (!memberParentData) {
        return res.status(404).json({ message: "Member not found" });
      }



      res.status(200).json({
        message: "Member parent retrieved successfully",
        data: memberParentData,
      });
    } catch (error) {
      console.error("Error fetching member colleagues:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
  isWithinGeoFenced: async (req, res) => {
    const userId = req?.userId
    const { latitude, longitude } = req?.params
    const memberDetails = await memberModel.findById({ _id: userId });
    const memberParentUserDetails = await userModel.findById({ _id: memberDetails?.parentUser });
    // console.log('memberParentUserDetails', memberParentUserDetails.geoFenced?.coordinates);
    let memberCoordinates = [latitude, longitude]

    // Extract the user's current location and geofenced coordinates
    const userLocation = memberCoordinates;  // [longitude, latitude]
    const geofenceCoordinates = memberParentUserDetails.geoFenced?.coordinates; // An array of arrays representing the polygon

    if (!userLocation || geofenceCoordinates.length === 0) {
      return false; // No location or geofence defined
    }

    // Perform the geospatial query to check if the user's location is within the geofence
    const isInGeofence = await memberModel.findOne({
      _id: userId,
      location: {
        $geoWithin: {
          $polygon: geofenceCoordinates // Use geofence coordinates as the polygon
        }
      }
    });

    console.log('isInGeofence--', isInGeofence);

    return res.status(200).json({
      status: 200,
      message: `User ${isInGeofence == null ? 'is not' : 'is'} within the range of the parent's geo-fenced area`,
      withinRange: isInGeofence ? true : false
    });

  }



};
