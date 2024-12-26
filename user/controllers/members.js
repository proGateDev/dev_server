const userModel = require("../models/profile");
const memberModel = require("../../member/models/profile");
const notificationModel = require("../../model/notification");
const superAdminCreationValidation = require("../validation/superAdminCreation");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const XLSX = require('xlsx');
// const sendMail = require("../../service/email");
const sendMail = require("../../service/sgMail");
const clientURL = require("../../constant/endpoint");
const { generatePassword, encryptPassword } = require('../../util/auth')

const socketService = require('../../service/socket');
const { sendNotification, sendServerDetailToClient } = require('../../service/socket');
const mongoose = require("mongoose");
const trackingHistoryModel = require("../../model/trackingHistory");
const attendanceModel = require("../../member/models/attendance");
const moment = require('moment'); // For handling date calculations
const assignmentModel = require("../../model/assignment");
const channelMemberModel = require("../../model/channelsMembers");

//==================================================
module.exports = {
  // getUserMembers: async (req, res) => {
  //   try {
  //     const userId = req.userId;
  //     console.log('------------- getUserMembers --------',userId);

  //     const userData = await memberModel.find({ parentUser: userId });

  //     if (!userData) {
  //       return res.status(404).json({
  //         status: 404,
  //         message: "No members added yet, please add members to track them."
  //       });
  //     }

  //     res.status(200).json({
  //       status: 200,
  //       message: "Members found successfully",
  //       members: userData,
  //       count: userData.length
  //     });
  //   } catch (error) {
  //     console.error("Error fetching user data:", error);
  //     res.status(500).json({ error: "Internal Server Error" });
  //   }
  // },





  getUserMembers: async (req, res) => {
    try {
      const userId = mongoose.Types.ObjectId(req.userId); // Convert the userId to ObjectId

      // Fetch members associated with the userId using aggregate
      const userData = await memberModel.aggregate([
        {
          $match: {
            parentUser: userId // Filter by the user's ID
          }
        },
        {
          $lookup: {
            from: 'trackinghistories', // Collection name in lowercase
            localField: '_id', // Field from member model (member's _id)
            foreignField: 'memberId', // Field from trackingHistories model (memberId)
            as: 'trackingHistories' // Output array field
          }
        },
        {
          $unwind: {
            path: '$trackingHistories',
            preserveNullAndEmptyArrays: true // Keep members even if they have no tracking history
          }
        },
        {
          $sort: {
            'location.updatedAt': -1 // Sort by location.updatedAt first
          }
        },
        {
          $group: {
            _id: '$_id',
            name: { $first: '$name' },
            email: { $first: '$email' },
            mobile: { $first: '$mobile' },
            groupType: { $first: '$groupType' },
            location: { $first: '$location' },
            latestTracking: { $first: '$trackingHistories' } // Get the latest tracking history
          }
        },
        {
          $project: {
            _id: 1,
            name: 1,
            email: 1,
            mobile: 1,
            groupType: 1,
            location: 1,
            latestTracking: {
              $cond: {
                if: { $ne: ['$latestTracking', null] }, // Check if latestTracking is not null
                then: '$latestTracking',
                else: null // or some default value
              }
            },
          }
        }
      ]);

      if (!userData.length) {
        return res.status(404).json({
          status: 404,
          message: "No members added yet, please add members to track them."
        });
      }

      res.status(200).json({
        status: 200,
        message: "Members found successfully",
        members: userData,
        count: userData.length
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },



  createUserMember: async (req, res) => {
    try {
      const userId = req.userId;
      let membersData = [];

      //============ AUTO uploading members ======================
      if (req.file) {
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        membersData = XLSX.utils.sheet_to_json(worksheet);
      }
      //============ MANUAL uploading members ======================
      else if (req.body && Object.keys(req.body).length > 0) { // Check if req.body is not empty
        membersData = req.body;
      } else {
        return res.status(400).json({
          status: 400,
          message: "No file or member data provided"
        });
      }

      const createdMembers = [];
      const password = generatePassword()
      // const password = '1234'
      // const passwordEncrypted = await encryptPassword()
      const passwordEncrypted = await bcrypt.hash(password, 10);



      for (const memberData of membersData) {
        if (!memberData?.name || !memberData?.email || !memberData?.mobile) {
          return res.status(400).json({
            status: 400,
            message: "Missing required fields in data"
          });
        }

        // Send email after creating the member
        try {
          const newMember = await memberModel.create({
            ...memberData,
            parentUser: userId,
            password: passwordEncrypted
          });

          const notifyTo = await notificationModel.create({
            userId,
            message: `You have added a new member: ${memberData?.name}`,
            isRead: false,


          });

          createdMembers.push(newMember);

          if (newMember && notifyTo) {

            const verificationToken = jwt.sign(
              { email: memberData.email, userId: newMember._id }, // Payload
              process.env.JWT_SECRET, // Secret key from your environment variables
              { expiresIn: '360m' } // Token expiration time
            );



            const verificationLink = `${clientURL}/verify-email?token=${verificationToken}`;
            const messageData = {
              from: {
                "email": "<nischal@progatetechnology.com>",
                "name": "DigiCare4U"
              },
              // from: '<nischal@progatetechnology.com>',
              to: memberData?.email,
              subject: 'Welcome to DigiCare4u! Please Verify Your Email',
              html: `
                            <div style="max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; font-family: Arial, sans-serif; color: #333;">
                                <div style="background-color: #4CAF50; padding: 20px; text-align: center;">
                                    <h1 style="color: white; margin: 0;">DigiCare4u</h1>
                                    <p style="color: #f0f0f0;">Your well-being, our priority.</p>
                                </div>
                                <div style="padding: 20px;">
                                    <h2 style="color: #4CAF50;">Welcome, ${memberData?.name}!</h2>
                                    <p>Thank you for joining DigiCare4u! To get started, please verify your email address by clicking the button below and use the password for first time login:</p>
                                    <p>Password : <strong>${password}</strong></p>
                                    <a href=${verificationLink} 
                                       style="display: inline-block; margin: 20px 0; padding: 12px 25px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                                      Verify Email
                                    </a>
                                    <h3 style="color: #4CAF50;">What Can You Do with DigiCare4u?</h3>
                                    <ul style="list-style-type: disc; margin-left: 20px;">
                                      <li>📍 Monitor locations in real-time</li>
                                      <li>⚠️ Receive instant alerts in emergencies</li>
                                      <li>🤝 Stay connected with family and friends</li>
                                    </ul>
                                    <p>If you have any questions or need assistance, feel free to reach out!</p>
                                    <p style="margin-top: 20px;">Best regards,<br>The DigiCare4u Team</p>
                                </div>
                                <footer style="background-color: #f9f9f9; padding: 10px; text-align: center; font-size: 0.8em; color: #777;">
                                    <p>&copy; ${new Date().getFullYear()} DigiCare4u. All rights reserved.</p>
                                </footer>
                            </div>
                        `,
            };

            await sendMail(messageData);
            // await sendMail();

            // sendNotification(userId, `You have added a new member: ${memberData?.name}`);
            // sendServerDetailToClient(` --------- server se aaya mera DOST ---------------- : ${memberData?.name}`);

            res.status(201).json({
              message: "Members imported successfully",
              members: createdMembers,
              verificationToken
            });
          } else {
            return res.status(500).json({
              status: 500,
              message: "Error saving members to the database"
            });
          }

          // console.log(` ---------- Email sent ----------------- `,memberData.email);
        } catch (emailError) {
          console.error(`Failed to send email to ${memberData.email}:`, emailError);
        }
      }

      // res.status(201).json({
      //   message: "Members imported successfully",
      //   members: createdMembers,
      // });
    } catch (error) {
      console.error("Error importing members:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },


  getUserMemberById: async (req, res) => {
    try {

      const userId = req.userId; // Get the logged-in user's ID from the request
      // const userId ='66f673eaa447d313a6747f9a'
      // console.log(req?.body, ' ============= getUserMemberById---------------------------');
      const memberId = req?.params?.memberId; // Get the memberId from the route parameters
      // console.log('params', req?.params);


      // console.log('--------  IDs ---------------',userId,memberId);
      // Find the member by ID, ensuring that it belongs to the user
      const memberData = await memberModel.findOne({ id: memberId, parentUser: userId });
      // console.log('--------  memberData ---------------',memberData);


      if (!memberData) {
        return res.status(404).json({
          status: 404,
          message: "Member not found or does not belong to the current user."
        });
      }

      res.status(200).json({
        status: 200,
        message: "Member found successfully",
        member: memberData
      });
    } catch (error) {
      console.error("Error fetching member data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },



  deleteUserMemberById: async (req, res) => {
    try {
      const userId = req.userId; // Get the logged-in user's ID from the request
      const memberId = req?.params?.memberId; // Get the memberId from the route parameters


      // Find and delete the member by ID, ensuring that it belongs to the user
      const memberData = await memberModel.findOneAndDelete({
        _id: memberId,
        //  parentUser: userId
      });

      if (!memberData) {
        return res.status(404).json({
          status: 404,
          message: "Member not found or does not belong to the current user."
        });
      }

      res.status(200).json({
        status: 200,
        message: "Member deleted successfully",
        member: memberData
      });
    } catch (error) {
      console.error("Error deleting member data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },


  getUserMemberDailyTransit: async (req, res) => {
    const { memberId } = req.params;
    const { date } = req.query;

    console.log('memberId 672b1a0a2c602f29a52ca408', memberId);


    if (!memberId || !date) {
      return res.status(400).json({ error: "Member ID and date are required" });
    }

    try {
      // Parse the date and get the start and end of the day
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      // Query database for locations within the specified date range
      const locationsGroupedByLocality = await trackingHistoryModel.aggregate([
        // Step 1: Match entries for the given memberId and day range
        {
          $match: {
            memberId: mongoose.Types.ObjectId(memberId),
            timestamp: { $gte: startOfDay, $lte: endOfDay }
          }
        },
        // Step 2: Group by locality
        {
          $group: {
            _id: "$locality", // Group by locality
            // entries: { $push: "$$ROOT" }, // Include all documents in the group
            count: { $sum: 1 }, // Count the number of entries for each locality
            averageTimestamp: { $avg: { $toLong: "$timestamp" } },// Calculate average timestamp
            locations: { $push: "$location.coordinates" }, // Include all location coordinates

          }
        },
        // Step 3: Sort the groups by count or other criteria
        {
          $sort: { count: -1 } // Sort by count in descending order
        }
      ]);

      const resultWithDates = locationsGroupedByLocality.map(group => ({
        ...group,
        averageTimestamp: new Date(group.averageTimestamp).toISOString() // Convert to ISO Date string
      }));

      console.log(resultWithDates);

      let finalData = resultWithDates.filter(item => item._id != null)

      console.log(locationsGroupedByLocality);

      res.json({
        status: 200,
        count: locationsGroupedByLocality.length,
        data: finalData,
        message: "Location found successfully"
      });
    } catch (error) {
      console.error("Error fetching locations: ", error);
      res.status(500).json({ error: "An error occurred while fetching locations." });
    }
  },


  getUserMemberDailyTransitActivityFrequency: async (req, res) => {
    try {
      console.log('getUserMemberDailyTransitActivityFrequency');

      const memberId = req.userId;
      const { date } = req.body;

      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      const result = await trackingHistoryModel.aggregate([
        {
          $match: {
            memberId: mongoose.Types.ObjectId(memberId),
            timestamp: { $gte: startDate, $lt: endDate },
          },
        },
        {
          $group: {
            _id: "$locality",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      // Filter out the result containing _id as null
      const filteredResult = result.filter(item => item._id !== null);

      res.json({
        status: 200,
        data: filteredResult
      });
    } catch (error) {
      res.status(404).json({
        status: 400,
        message: "Failed to fetch visit frequencies"
      });
    }
  },


  getUserMemberDailyTransitActivityFrequency_: async (req, res) => {
    try {
      // const memberId = req.userId;
      const { date, memberId } = req.body;
      console.log('getUserMemberDailyTransitActivityFrequency_ _____________', memberId);

      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      const result = await trackingHistoryModel.aggregate([
        {
          $match: {
            memberId: mongoose.Types.ObjectId(memberId),
            timestamp: { $gte: startDate, $lt: endDate },
          },
        },
        {
          $group: {
            _id: "$locality",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      // Filter out the result containing _id as null
      const filteredResult = result.filter(item => item._id !== null);

      res.json({
        status: 200,
        data: filteredResult
      });
    } catch (error) {
      res.status(404).json({
        status: 400,
        message: "Failed to fetch visit frequencies"
      });
    }
  },



  getTodayAttendance_: async (req, res) => {
    try {
      console.log('parentId');
      const parentId = req.userId; // Assuming user info is added to the request via middleware

      // Get today's start and end time using new Date()
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0); // Set to start of the day (00:00:00)

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999); // Set to end of the day (23:59:59)
      console.log(startOfDay, endOfDay);

      // Fetch all members belonging to the parent user
      const allMembers = await memberModel.find({ parentUser: parentId });

      // Fetch attendance records for today for these members based on `createdAt`
      const attendanceRecords = await attendanceModel
        .find({
          parentId,
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        })
        .sort({ createdAt: 1 }); // Sort by createdAt to get records in chronological order

      // Fetch member details for attendance records
      const memberDetailsMap = new Map();

      // Query member details for all `memberId` in attendanceRecords
      const memberIds = attendanceRecords.map((record) => record.memberId);
      const members = await memberModel.find({ _id: { $in: memberIds } });

      members.forEach((member) => {
        memberDetailsMap.set(member._id.toString(), member);
      });

      // Separate members who have attended and those who haven't
      const attendedMemberIds = new Set(
        attendanceRecords.map((record) => record.memberId.toString())
      );

      const attendedMembers = attendanceRecords.map((record) => {
        const totalHours = record.totalWorkHours || 0;
        const status = record.punchOutTime ? 'present' : 'in-progress';
        const memberDetail = memberDetailsMap.get(record.memberId.toString());

        return {
          _id: record._id,
          memberId: record.memberId,
          name: memberDetail?.name || 'Unknown',
          email: memberDetail?.email || 'Unknown',
          punchInTime: record.punchInTime,
          punchOutTime: record.punchOutTime,
          totalWorkHours: totalHours,
          locationDuringPunchIn: record.locationDuringPunchIn,
          locationDuringPunchOut: record.locationDuringPunchOut,
          status,
        };
      });

      // Filter out members who have not marked attendance
      const notMarkedAttendance = allMembers
        .filter((member) => !attendedMemberIds.has(member._id.toString()))
        .map((member) => ({
          memberId: member._id,
          name: member.name,
          email: member.email,
          status: 'not-marked',
        }));

      // Combine attended and not marked attendance
      const allAttendance = [...attendedMembers, ...notMarkedAttendance];

      return res.status(200).json({
        success: true,
        attendance: allAttendance,
      });
    } catch (error) {
      console.error("Error fetching today's attendance:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to fetch attendance data.",
      });
    }
  },



  getChannelMembersAttendance: async (req, res) => {
    const { ObjectId } = require('mongoose').Types;

    try {
      const parentId = req.userId; // Assuming user info is added to the request via middleware
      const { startDate, endDate, channelId } = req.query;

      // Validate if channelId is provided
      if (!channelId) {
        return res.status(400).json({
          success: false,
          message: 'Channel ID is required.',
        });
      }

      let startOfDay, endOfDay;

      // If the date range is provided, use it; otherwise, default to today's date
      if (startDate && endDate) {
        startOfDay = new Date(startDate);
        endOfDay = new Date(endDate);
      } else {
        // Default to today's date range if no date range is provided
        startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0); // Start of the day (00:00:00)

        endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999); // End of the day (23:59:59)
      }

      // Fetch all members belonging to the parent user and the specified channel
      const channelMembers = await channelMemberModel
        .find({ addedBy: parentId, channelId })
        .populate('memberId');

      if (!channelMembers.length) {
        return res.status(404).json({
          success: false,
          message: 'No members found for the specified channel.',
        });
      }

      // Extract member IDs for attendance query
      const memberIds = channelMembers.map((member) => ObjectId(member.memberId._id));

      // Fetch attendance records for the given date range for these members
      const attendanceRecords = await attendanceModel.find({
        parentId,
        memberId: { $in: memberIds },
        punchInTime: { $gte: startOfDay, $lte: endOfDay },
      });

      // Map member details for attendance records
      const memberDetailsMap = new Map();
      channelMembers.forEach((member) => {
        const { _id, name, email } = member.memberId;
        memberDetailsMap.set(_id.toString(), { name, email });
      });

      // Separate members who have attended and those who haven't
      const attendedMemberIds = new Set(
        attendanceRecords.map((record) => record.memberId.toString())
      );

      const attendedMembers = attendanceRecords.map((record) => {
        const memberDetail = memberDetailsMap.get(record.memberId.toString());

        return {
          _id: record._id,
          memberId: record.memberId,
          name: memberDetail?.name || 'Unknown',
          email: memberDetail?.email || 'Unknown',
          punchInTime: record.punchInTime,
          punchOutTime: record.punchOutTime,
          totalWorkHours: record.totalWorkHours || 0,
          locationDuringPunchIn: record.locationDuringPunchIn,
          locationDuringPunchOut: record.locationDuringPunchOut,
          status: record.punchOutTime ? 'present' : 'in-progress',
        };
      });

      const notMarkedAttendance = channelMembers
        .filter((member) => !attendedMemberIds.has(member.memberId._id.toString()))
        .map((member) => {
          const { _id, name, email } = member.memberId;
          return {
            memberId: _id,
            name: name || 'Unknown',
            email: email || 'Unknown',
            status: 'absent',
          };
        });

      // Combine attended and not marked attendance
      const allAttendance = [...attendedMembers, ...notMarkedAttendance];

      return res.status(200).json({
        success: true,
        count: allAttendance.length,
        attendance: allAttendance,
      });
    } catch (error) {
      console.error('Error fetching channel attendance data:', error);
      return res.status(500).json({
        success: false,
        message: 'Unable to fetch attendance data.',
      });
    }
  },

  // getChannelMembersAttendance_new: async (req, res) => {
  //   const { ObjectId } = require('mongoose').Types;

  //   try {
  //     const parentId = req.userId; // Assuming user info is added to the request via middleware
  //     const { startDate, endDate, channelId } = req.query;

  //     // Validate if channelId is provided
  //     if (!channelId) {
  //       return res.status(400).json({
  //         success: false,
  //         message: 'Channel ID is required.',
  //       });
  //     }

  //     let startOfDay, endOfDay;

  //     // If the date range is provided, use it; otherwise, default to today's date
  //     if (startDate && endDate) {
  //       startOfDay = new Date(startDate);
  //       endOfDay = new Date(endDate);
  //     } else {
  //       // Default to today's date range if no date range is provided
  //       startOfDay = new Date();
  //       startOfDay.setHours(0, 0, 0, 0); // Start of the day (00:00:00)

  //       endOfDay = new Date();
  //       endOfDay.setHours(23, 59, 59, 999); // End of the day (23:59:59)
  //     }

  //     // Fetch all members belonging to the parent user and the specified channel
  //     const channelMembers = await channelMemberModel
  //       .find({ addedBy: parentId, channelId })
  //       .populate('memberId');

  //     if (!channelMembers.length) {
  //       return res.status(404).json({
  //         success: false,
  //         message: 'No members found for the specified channel.',
  //       });
  //     }

  //     // Extract member IDs for attendance query
  //     const memberIds = channelMembers.map((member) => ObjectId(member.memberId._id));

  //     // Fetch attendance records for the given date range for these members
  //     const attendanceRecords = await attendanceModel.find({
  //       parentId,
  //       memberId: { $in: memberIds },
  //       punchInTime: { $gte: startOfDay, $lte: endOfDay },
  //     });

  //     // Generate an array of dates for the specified range
  //     const getDateArray = (start, end) => {
  //       const dateArray = [];
  //       let currentDate = new Date(start);
  //       while (currentDate <= end) {
  //         dateArray.push(new Date(currentDate));
  //         currentDate.setDate(currentDate.getDate() + 1);
  //       }
  //       return dateArray;
  //     };

  //     const dateArray = getDateArray(startOfDay, endOfDay);

  //     // Map member details with attendance data
  //     const result = channelMembers.map((member) => {
  //       const { _id, name, email } = member.memberId;

  //       // Filter attendance records for the current member
  //       const memberAttendance = attendanceRecords.filter(
  //         (record) => record.memberId.toString() === _id.toString()
  //       );

  //       let totalPresent = 0;
  //       let totalAbsent = 0;

  //       // Create attendance data for each date in the range
  //       const records = dateArray.map((date) => {
  //         const formattedDate = date.toISOString().split('T')[0]; // Get YYYY-MM-DD format
  //         const attendanceForDate = memberAttendance.find(
  //           (record) => new Date(record.punchInTime).toISOString().split('T')[0] === formattedDate
  //         );

  //         if (attendanceForDate) {
  //           totalPresent++;
  //         } else {
  //           totalAbsent++;
  //         }

  //         return {
  //           date: formattedDate,
  //           status: attendanceForDate ? 'present' : 'absent',
  //         };
  //       });

  //       return {
  //         memberId: _id,
  //         name: name || 'Unknown',
  //         email: email || 'Unknown',
  //         totalPresent,
  //         totalAbsent,
  //         data: records,
  //       };
  //     });

  //     return res.status(200).json({
  //       success: true,
  //       count: result.length,
  //       attendance: result,
  //     });
  //   } catch (error) {
  //     console.error('Error fetching channel attendance data:', error);
  //     return res.status(500).json({
  //       success: false,
  //       message: 'Unable to fetch attendance data.',
  //     });
  //   }
  // },  


  getChannelMembersAttendance_new: async (req, res) => {
    const { ObjectId } = require('mongoose').Types;

    try {
      const parentId = req.userId; // Assuming user info is added to the request via middleware
      const { startDate, endDate, channelId } = req.query;

      // Validate if channelId is provided
      if (!channelId) {
        return res.status(400).json({
          success: false,
          message: 'Channel ID is required.',
        });
      }

      let startOfDay, endOfDay;

      // If the date range is provided, use it; otherwise, default to today's date
      if (startDate && endDate) {
        startOfDay = new Date(startDate);
        endOfDay = new Date(endDate);
      } else {
        // Default to today's date range if no date range is provided
        startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0); // Start of the day (00:00:00)

        endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999); // End of the day (23:59:59)
      }

      // Fetch all members belonging to the parent user and the specified channel
      const channelMembers = await channelMemberModel
        .find({ addedBy: parentId, channelId })
        .populate('memberId');

      if (!channelMembers.length) {
        return res.status(404).json({
          success: false,
          message: 'No members found for the specified channel.',
        });
      }

      // Extract member IDs for attendance query
      const memberIds = channelMembers.map((member) => ObjectId(member.memberId._id));

      // Fetch attendance records for the given date range for these members
      const attendanceRecords = await attendanceModel.find({
        parentId,
        memberId: { $in: memberIds },
        punchInTime: { $gte: startOfDay, $lte: endOfDay },
      });

      // Generate an array of dates for the specified range
      const getDateArray = (start, end) => {
        const dateArray = [];
        let currentDate = new Date(start);
        while (currentDate <= end) {
          dateArray.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }
        return dateArray;
      };

      const dateArray = getDateArray(startOfDay, endOfDay);

      // Map member details with attendance data
      const result = channelMembers.map((member) => {
        const { _id, name, email } = member.memberId;

        // Filter attendance records for the current member
        const memberAttendance = attendanceRecords.filter(
          (record) => record.memberId.toString() === _id.toString()
        );

        let totalPresent = 0;
        let totalAbsent = 0;

        // Create attendance data for each date in the range
        const records = dateArray.map((date) => {
          const formattedDate = date.toISOString().split('T')[0]; // Get YYYY-MM-DD format
          const attendanceForDate = memberAttendance.find(
            (record) => new Date(record.punchInTime).toISOString().split('T')[0] === formattedDate
          );

          if (attendanceForDate) {
            totalPresent++;
          } else {
            totalAbsent++;
          }

          return {
            date: formattedDate,
            status: attendanceForDate ? 'present' : 'absent',
            time: attendanceForDate
              ? new Date(attendanceForDate.punchInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : null,
          };
        });

        return {
          memberId: _id,
          name: name || 'Unknown',
          email: email || 'Unknown',
          totalPresent,
          totalAbsent,
          data: records,
        };
      });

      return res.status(200).json({
        success: true,
        count: result.length,
        attendance: result,
      });
    } catch (error) {
      console.error('Error fetching channel attendance data:', error);
      return res.status(500).json({
        success: false,
        message: 'Unable to fetch attendance data.',
      });
    }
  },


  getChannelMembersDailyAssignments: async (req, res) => {
    try {
      const userId = req.userId; // Assuming `checkUserToken` middleware attaches the user ID
      const channelId = req.params.channelId
      const currentDate = new Date().toISOString().split('T')[0];

      // 1. Get all members for the user

      const members = await channelMemberModel.find({ addedBy: userId, channelId }).populate('memberId')
      console.log(userId, channelId, 'refp---------', members);
      // const members = await memberModel.find({parentUser: userId });

      if (!members.length) {
        return res.status(404).json({
          success: false,
          message: "No members found for the user.",
        });
      }

      // Extract member IDs
      const memberIds = members.map(member => member._id);

      // 2. Get assignments for the current date for these members
      const assignments = await assignmentModel.find({
        memberId: { $in: memberIds },
        assignedAt: {
          $gte: new Date(`${currentDate}T00:00:00.000Z`),
          $lte: new Date(`${currentDate}T23:59:59.999Z`),
        },
      });

      // 3. Prepare the response
      const response = members.map(member => {
        const memberAssignments = assignments.filter(
          assignment => assignment.memberId.toString() === member._id.toString()
        );

        return {
          name: member.memberId?.name, // Assuming `Member` model has a `name` field
          totalAssignments: memberAssignments.length,
          pending: memberAssignments.filter(a => a.status === 'Pending').length,
          completed: memberAssignments.filter(a => a.status === 'Completed').length,
        };
      });

      return res.status(200).json({
        success: true,
        data: response,

      });
    } catch (error) {
      console.error("Error fetching daily assignments:", error);
      return res.status(500).json({
        success: false,
        message: "Server error. Please try again later.",
      });
    }
  },



  getChannelMembersAssignmentsByDateRange: async (req, res) => {
    try {
      const userId = req.userId; // Assuming `checkUserToken` middleware attaches the user ID
      const channelId = req.params.channelId;
      const { startDate, endDate } = req.query;

      // Validate `startDate` and `endDate`
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Start date and end date are required.",
        });
      }

      // Parse the date range
      const startOfRange = new Date(`${startDate}`);
      const endOfRange = new Date(`${endDate}`);

      // 1. Get all members for the user within the specified channel
      const members = await channelMemberModel
        .find({ addedBy: userId, channelId })
        .populate("memberId");

      // console.log('members', members);




      if (!members.length) {
        return res.status(404).json({
          success: false,
          message: "No members found for the user in the specified channel.",
        });
      }

      // Extract member IDs
      const memberIds = members?.map((member) => member?.memberId?._id);

      // console.log('membersmemberIds ',members[0], memberIds );
      // 2. Get assignments for the specified date range for these members
      const assignments = await assignmentModel.find({
        memberId: { $in: memberIds },
        assignedAt: {
          $gte: new Date(`${startOfRange}`),
          $lte: new Date(`${endOfRange}`),
        },
        // assignedAt: {
        //   $gte: startOfRange,
        //   $lte: endOfRange,
        // },
      });

      // 3. Prepare the response
      const response = members.map((member) => {
        // console.log('members=================',member.memberId._id );
        const memberAssignments = assignments.filter((assignment) => {
          // console.log("assignment.memberId ===", assignment.memberId);
          // console.log("member._id ===", member._id);
      
          return assignment.memberId.toString() === member.memberId._id.toString();
          // return assignment.memberId=== member.memberId._id;
        });
      
        // console.log("memberAssignments ===", memberAssignments);
      
        // Count the total, pending, and completed assignments for the member
        return {
          name: member.memberId?.name || "Unknown", // Fallback for name
          totalAssignments: memberAssignments.length,
          pending: memberAssignments.filter((a) => a.status === "Pending").length,
          completed: memberAssignments.filter((a) => a.status === "Completed").length,
        };
      });
      
      // Send the response
      return res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error("Error fetching assignments for the specified date range:", error);
      return res.status(500).json({
        success: false,
        message: "Server error. Please try again later.",
      });
    }
  }








}





