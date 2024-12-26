const memberModel = require("../models/profile");
const trackingHistoryModel = require('../../model/trackingHistory'); // Update with the correct path
const getAddressFromCoordinates = require("../../service/geoCode");

//==================================================

module.exports = {

    updateMemberLocation: async (req, res) => {
        try {
            const memberId = req.userId;
            const { latitude, longitude } = req.body;
            console.log('locatin ----------memberId ', latitude, longitude, memberId);

            // Update the member's location
            const updatedMember = await memberModel.findByIdAndUpdate(
                memberId,
                {
                    location: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    locationStatus: 'active',
                },
                { new: true }
            );

            // Save to tracking history
            const newLocationHistory = new trackingHistoryModel({
                memberId,
                location: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                },
            });
            await newLocationHistory.save();

            res.status(200).json({ message: 'Location updated successfully', member: updatedMember });
        } catch (error) {
            res.status(500).json({ message: 'Error updating location', error: error.message });
        }
    },

    // postMemberLocation: async (req, res) => {
    //     try {
    //         const memberId = req.userId; // Get the member ID from the request
    //         const { latitude, longitude } = req.body; // Extract latitude and longitude from the request body
    //         console.log('Location ---------- Member ID:', memberId, 'Latitude:', latitude, 'Longitude:', longitude);

    //         // Create a new location entry in the tracking history
    //         const newLocationHistory = new trackingHistoryModel({
    //             memberId, // Associate the location with the member ID
    //             location: {
    //                 type: 'Point',
    //                 coordinates: [longitude, latitude], // Store coordinates as [longitude, latitude]
    //             },
    //             locationStatus: 'active', // You can add this if it's part of your schema
    //         });

    //         // Save the new location history to the database
    //         await newLocationHistory.save();

    //         res.status(201).json({ message: 'Location posted successfully', location: newLocationHistory });
    //     } catch (error) {
    //         res.status(500).json({ message: 'Error posting location', error: error.message });
    //     }
    // },





    postMemberLocation: async (req, res) => {
        try {
            const memberId = req.userId; // Get the member ID from the request
            const { latitude, longitude } = req.body; // Extract latitude and longitude from the request body
            console.log('Location ---------- Member ID:', memberId, 'Latitude:', latitude, 'Longitude:', longitude);

            // Get formatted address from coordinates
            const addressDetails = await getAddressFromCoordinates(latitude, longitude);

            // Create a new location entry in the tracking history
            const newLocationHistory = new trackingHistoryModel({
                memberId, // Associate the location with the member ID
                location: {
                    type: 'Point',
                    coordinates: [longitude, latitude], // Store coordinates as [longitude, latitude]
                },
                // Add address details to the tracking history
                formattedAddress: addressDetails.formattedAddress,
                locality: addressDetails.locality,
                sublocality: addressDetails.sublocality,
                region: addressDetails.region,
                country: addressDetails.country,
                postalCode: addressDetails.postalCode,
                landmarks: addressDetails.landmarks,
                timestamp: new Date() // Optional: Use the current date and time
            });

            // Save the new location history to the database
            await newLocationHistory.save();

            res.status(201).json({
                message: 'Location posted successfully',
                location: newLocationHistory,
            });
        } catch (error) {
            res.status(500).json({ message: 'Error posting location', error: error.message });
        }
    },

    getMemberLocations: async (req, res) => {
        try {
            const memberId = req.userId; // Get the member ID from the request
            const { interval } = req.query; // Get the interval from the query parameters
            const currentDate = new Date();
            let dateLimit;
    
            // Determine the date limit based on the interval
            switch (interval) {
                case '1day':
                    dateLimit = new Date(currentDate.setHours(0, 0, 0, 0)); // Start of today
                    break;
                case '7days':
                    dateLimit = new Date(currentDate.setDate(currentDate.getDate() - 7)); // 7 days ago
                    break;
                case '1month':
                    dateLimit = new Date(currentDate.setMonth(currentDate.getMonth() - 1)); // 1 month ago
                    break;
                default:
                    return res.status(400).json({ message: "Invalid interval" });
            }
    
            // Fetch the member's tracking history with a limit of 10 records
            const locations = await trackingHistoryModel.find({ memberId, timestamp: { $gte: dateLimit } })
                .sort({ timestamp: -1 }) // Sort by most recent first
                .limit(10); // Limit to the top 10 records
    
            if (!locations.length) {
                return res.status(404).json({ message: "No locations found for this member" });
            }
    
            res.status(200).json({ message: "Locations fetched successfully", locations });
        } catch (error) {
            console.error("Error fetching locations:", error);
            res.status(500).json({ message: "Error fetching locations", error: error.message });
        }
    }
    


}
