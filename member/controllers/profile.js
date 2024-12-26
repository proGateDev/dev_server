const trackingHistoryModel = require("../../model/trackingHistory");
const getAddressFromCoordinates = require("../../service/geoCode");
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






  userLiveLocationUpdate: async (req, res) => {
    try {
      
      
      const memberId = req.userId; // Get the user ID from the request (assuming it's available in the request object)
      const {
        latitude,
        longitude,
        locationDetails
      } = req.body; // Extract the fields to be updated from the request body
      // console.log('       locationDetails........', locationDetails);
      const member = await memberModel.findById(memberId);
      
      console.log('-------------- userLiveLocationUpdate -------',latitude,
        longitude,);



      console.log(`  ....... Before adding  memberModel .............`);
      // Step 1: Find the member
      const fetchedMember = await memberModel.findById(memberId);
      console.log('member hai ... ', fetchedMember.name);

      // Step 2: Update the member's location if the member is found
      if (fetchedMember) {
        fetchedMember.set({
          location: {
            type: 'Point',
            coordinates: [ latitude,longitude],
            updatedAt: Date.now(),
          },
        });
        // member.location.coordinates = [latitude, longitude];
        // member.location.updatedAt = Date.now();

        let a= await fetchedMember.save();  
        console.log('=====aa===============================');
        console.log(a);
        console.log('====================================');
      }





      // const updatedUser = await memberModel.findByIdAndUpdate(
      //   memberId, // Replace this with the actual member's userId
      //   {
      //     $set: {
      //       'location.coordinates': [latitude, longitude], // Use dot notation to update nested coordinates
      //       'location.updatedAt': Date.now(), // Update the timestamp when location changes
      //     },
      //   },
      //   // { new: true, runValidators: true } // Return /the updated document and ensure validation
      // );
      console.log(`    ${member?.name}  Location Updated !`);
      console.log('locationDetails', locationDetails);

      // let geoDecodedPlaces = await getAddressFromCoordinates(latitude, longitude)
      // console.log('places :', geoDecodedPlaces);
      // console.log(`  ....... Before adding  trackingHistoryModel .............`);


      const newLocationHistory = new trackingHistoryModel({
        memberId,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        preferredAddress: locationDetails?.preferredAddress,
        address: locationDetails?.address,
        locality: locationDetails?.locality,
        street: locationDetails?.street,
        neighborhood: locationDetails?.neighborhood,
        region: locationDetails?.region,
        district: locationDetails?.district,
        country: locationDetails?.country,
        postcode: locationDetails?.postcode,
        landmarks: locationDetails?.landmarks,
      });
      await newLocationHistory.save();
      console.log(`  ....... Recorded Inserted !`);

      if (!fetchedMember) {
        return res.status(404).json({ message: fetchedMember });
      }

      res.status(200).json({ message: "User updated successfully", user: fetchedMember });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Error updating user", error: error.message });
    }
  }






};
