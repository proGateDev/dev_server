
// Punch-in for a member
const Attendance = require('../models/attendance'); // Import the attendance model
const memberModel = require('../../member/models/profile'); // Import the attendance model

exports.markAttendance = async (req, res) => {
    try {
        const memberId = req.userId
        const { parentId, latitude, longitude } = req.body;
        console.log('req.body--------', parentId);

        // Get today's date (ignoring time)
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to the beginning of the day

        // Find if there is an attendance record for the member for today
        const existingAttendance = await Attendance.findOne({
            memberId,
            parentId, // Also check for the parentId to ensure attendance is unique per member and user
            createdAt: { $gte: today } // Find attendance for today
        });

        if (existingAttendance) {
            // If attendance for today already exists, return an error
            return res.status(200).json({
                message: 'Attendance already marked for today.',
                existingAttendance,
                alreadyMarked: true,
            });
        }

        // If no attendance for today, create a new punch-in record
        const newPunchIn = new Attendance({
            memberId,
            parentId, // Include parentId when creating the new record
            punchInTime: new Date(),
            locationDuringPunchIn: { latitude, longitude }
        });

        await newPunchIn.save();
        // console.log('========= Attednace Marked ==============================');

        return res.status(201).json({
            message: 'Punch-in successful',
            data: newPunchIn,
            alreadyMarked: false

        });
    } catch (error) {
        console.error('Error during punch-in:', error); // Log the error for debugging
        return res.status(500).json({ message: 'Error during punch-in', error: error.message });
    }
};





exports.getAttendanceRecords_old = async (req, res) => {
    try {
        const { startDate, endDate } = req.params; // Extract the date range from route parameters
        const memberId = req.userId; // Extract the member ID from the authenticated user token
        console.log('startDate:', startDate, 'endDate:', endDate, 'memberId:', memberId);

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start date and end date parameters are required.' });
        }

        // Fetch the parent user (parentId) for the given memberId
        const member = await memberModel.findById(memberId).select('parentUser'); // Assuming 'parentUser' is the field name
        if (!member || !member.parentUser) {
            return res.status(404).json({ message: 'Parent user not found for the given member.' });
        }

        const parentId = member.parentUser; // Extract the parentId
        console.log('ParentId:', parentId);

        // Parse the date range for filtering
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); // Start of the day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of the day

        // Fetch attendance records for the given date range and parentId
        const attendanceRecords = await Attendance.find({
            memberId, // Filter by memberId
            parentId, // Match with parentId
            punchInTime: {
                $gte: start,
                $lte: end,
            },
        })
            // .populate('memberId', 'name email') // Populate member details if required
            .sort({ punchInTime: -1 }); // Sort by punch-in time, latest first

        console.log('attendanceRecords:', attendanceRecords);

        if (attendanceRecords.length === 0) {
            return res.status(404).json({ message: 'No attendance records found for the given date range.' });
        }

        return res.status(200).json({
            message: 'Attendance records retrieved successfully.',
            count: attendanceRecords.length,
            data: attendanceRecords,
        });
    } catch (error) {
        console.error('Error fetching attendance records:', error); // Log the error for debugging
        return res.status(500).json({ message: 'Error fetching attendance records', error: error.message });
    }
};


exports.getAttendanceRecords = async (req, res) => {
    try {
        const { startDate, endDate } = req.params; // Extract the date range from route parameters
        const memberId = req.userId; // Extract the member ID from the authenticated user token
        console.log('startDate:', startDate, 'endDate:', endDate, 'memberId:', memberId);

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start date and end date parameters are required.' });
        }

        // Fetch the parent user (parentId) for the given memberId
        const member = await memberModel.findById(memberId).select('parentUser'); // Assuming 'parentUser' is the field name
        if (!member || !member.parentUser) {
            return res.status(404).json({ message: 'Parent user not found for the given member.' });
        }

        const parentId = member.parentUser; // Extract the parentId
        console.log('ParentId:', parentId);

        // Parse the date range for filtering
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); // Start of the day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of the day

        // Fetch attendance records for the given date range and parentId
        const attendanceRecords = await Attendance.find({
            memberId, // Filter by memberId
            parentId, // Match with parentId
            punchInTime: {
                $gte: start,
                $lte: end,
            },
        })
            .sort({ punchInTime: -1 }); // Sort by punch-in time, latest first

        console.log('attendanceRecords:', attendanceRecords);

        // Prepare response for each day in the date range
        const response = [];
        const currentDate = new Date(start);

        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0]; // Format date as YYYY-MM-DD
            const recordForDate = attendanceRecords.find((record) => {
                const recordDate = new Date(record.punchInTime).toISOString().split('T')[0];
                return recordDate === dateStr;
            });

            if (recordForDate) {
                response.push({
                    date: dateStr,
                    status: 'present',
                    punchInTime: recordForDate.punchInTime,
                    punchOutTime: recordForDate.punchOutTime,
                    otherFields: recordForDate.otherFields, // Add other necessary fields
                });
            } else {
                response.push({
                    date: dateStr,
                    status: 'absent',
                });
            }

            // Move to the next day
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return res.status(200).json({
            message: 'Attendance records retrieved successfully.',
            count: response.length,
            data: response,
        });
    } catch (error) {
        console.error('Error fetching attendance records:', error); // Log the error for debugging
        return res.status(500).json({ message: 'Error fetching attendance records', error: error.message });
    }
};
