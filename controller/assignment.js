const assignmentModel = require('../model/assignment');
const { getAddressFromCoordinates_v1 } = require('../service/geoCode');
const axios = require('axios');










const getAddress = async (latitude, longitude) => {




    // console.log('latitude aaya____________ : ', latitude);
    const accessToken =
        'sk.eyJ1IjoicHJvZGV2MzY5IiwiYSI6ImNtM21vaHppbzB5azQycXF6MTJyZjJuamcifQ.ZnpKclc0DrYzGN1fA1jqNQ'; // Replace with your Mapbox token
    const url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${longitude}&latitude=${latitude}&access_token=${accessToken}&limit=1`;

    try {
        console.log('staerted --');

        const response = await axios.get(url);
        // console.log('response ________________ : ',response.data.features[0].properties.full_address);
        // console.log('response ________________ : ', response?.data?.features[0]?.properties?.context?.locality?.name);

        // if (response.data && response.data.features.length > 0) {
        if (response.data) {


            return response.data
        } else {
            console.log('Address not found');
        }
    } catch (error) {
        console.error('Error fetching address:', error);
        console.log('Error fetching address');
    }
};





//==========================================
module.exports = {
    assignment: async (req, res) => {
        try {
            const userId = req.userId
            // console.log(' ---- userId   -----------', userId);
            const { memberId, locationName, coordinates, dateTime, eventName } = req.body;
            // console.log(' assigning this .......', coordinates?.lat);
            let locationNameDecodedResponse = await getAddress(coordinates?.lat, coordinates?.lng)
            let locationNameDecoded = locationNameDecodedResponse?.features[0]?.properties?.place_formatted

            // Check if all required fields are provided
            if (
                !memberId ||
                !userId ||
                !locationName ||
                !coordinates) {
                return res.status(400).json({
                    status: 400,
                    message: 'All fields are required'
                });
            }

            // Create a new assignment
            const newAssignment = new assignmentModel({
                memberId,
                userId,
                locationName: locationNameDecoded,
                coordinates,
                assignedAt: dateTime?.date,
                time: dateTime?.time,
                eventName
            });

            // Save the assignment to the database
            const savedAssignment = await newAssignment.save();
            console.log('============ newAssignment ========================');
            console.log(newAssignment);
            // console.log('====================================');
            res.status(201).json({
                message: 'Location assigned successfully',
                assignment: savedAssignment,
            });
        } catch (error) {
            console.error("Error assigning location:", error);
            res.status(500).json({ error: 'Failed to assign location' });
        }
    },
    getAssignment: async (req, res) => {
        try {

            const memberId = req?.userId
            console.log('getting assignments for ....');




            const memberAssignment = await assignmentModel.find({ memberId: memberId });

            if (!memberAssignment) {
                return res.status(404).json({ message: "User not found" });
            }

            const jsonResponse = {
                message: "Assignments found successfully",
                assignedLocations: memberAssignment,
            };

            res.status(200).json(jsonResponse);
        } catch (error) {
            console.error("Error fetching user data:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    },


    patchAssignment: async (req, res) => {
        try {
            console.log('Updating task status ------------------...', req.body);

            const { taskId, status } = req.body;

            // Check if the taskId and status are provided
            if (!taskId || !status) {
                return res.status(400).json({
                    status: 400,
                    message: 'Task ID and status are required',
                });
            }

            // Validate the status
            const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    status: 400,
                    message: `Invalid status. Allowed statuses are: ${validStatuses.join(', ')}`,
                });
            }

            // Find the task and update its status
            const updatedTask = await assignmentModel.findByIdAndUpdate(
                taskId,
                { status },
                { new: true } // Return the updated document
            );

            if (!updatedTask) {
                return res.status(404).json({
                    status: 404,
                    message: 'Task not found',
                });
            }

            console.log('Task status updated:', updatedTask);

            res.status(200).json({
                message: 'Task status updated successfully',
                task: updatedTask,
            });
        } catch (error) {
            console.error('Error updating task status:', error);
            res.status(500).json({ error: 'Failed to update task status' });
        }
    },



    getMemberAssignments: async (req, res) => {
        try {
            const { startDate, endDate } = req.params; // Get startDate and endDate from request params
            const memberId = req?.userId;

            // Ensure startDate and endDate are in a valid format
            const start = new Date(startDate);
            const end = new Date(endDate);
            // console.log('-____ DATES _______:', start, end);

            if (isNaN(start) || isNaN(end)) {
                return res.status(400).json({ message: 'Invalid date format' });
            }

            // console.log('Getting assignments for member:', memberId);

            // Fetch the assignments within the date range
            const memberAssignments = await assignmentModel.find({
                memberId: memberId,
                assignedAt: { $gte: start, $lte: end }, // Filter by assignmentDate within the date range
            })
            // console.log('memberAssignments', memberId);

            if (!memberAssignments || memberAssignments.length === 0) {
                return res.status(404).json({ message: 'No assignments found for the given period' });
            }
            console.log('memberAssignments', memberAssignments);

            // Prepare the member's general information
            const memberInfo = {
                id: memberId,
                totalTasks: memberAssignments.length,
                pendingTasks: memberAssignments.filter(task => task.status === 'pending').length,
                completedTasks: memberAssignments.filter(task => task.status === 'completed').length,
                imageUrl: 'https://via.placeholder.com/150', // Replace with actual member image URL
                // address: 'Gomati Nagar, Lucknow, Uttar Pradesh, 226011', // Replace with actual member address
                tasks: memberAssignments.map(task => ({
                    taskId: task._id.toString(),
                    eventName: task.eventName,
                    locationName: task.locationName,
                    status: task.status,
                    location: task.coordinates,
                    date: task.assignedAt.toISOString(),
                    time: task.time,
                })),
            };
            // console.log('mil to ghaya ------------------');

            res.status(200).json({
                message: 'Assignments found successfully',
                member: memberInfo,
            });

        } catch (error) {
            console.error('Error fetching user assignments:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },
    getMemberAssignmentById: async (req, res) => {
        try {
            const { assignmentId } = req.params; // Get startDate and endDate from request params

            const memberId = req?.userId;



            if ((!memberId)) {
                return res.status(400).json({ message: 'Invalid memberId' });
            }

            // console.log('Getting assignments for member:', memberId);

            // Fetch the assignments within the date range
            const memberAssignments = await assignmentModel.find({
                _id: assignmentId,
            })

            if (!memberAssignments || memberAssignments.length === 0) {
                return res.status(404).json({ message: 'No assignments found ' });
            }


            res.status(200).json({
                status: 200,
                message: 'Assignment found successfully',
                assignment: memberAssignments,
            });

        } catch (error) {
            console.error('Error fetching user assignments:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }





}
