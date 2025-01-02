
//==================================================

const { message } = require("../admin/validation/superAdminCreation");
const memberModel = require("../member/models/profile");
const attendanceModel = require("../member/models/attendance");
const channelModel = require("../model/channels");
const channelMemberModel = require("../model/channelsMembers");
const userModel = require("../user/models/profile");
const moment = require('moment'); // For date manipulation, optional but helps for date formatting


module.exports = {

  createChannel: async (req, res) => {
    try {
      console.log("-------- Creating Channels ----------");

      const { name, description, createdByModel } = req.body;
      const loggedInUserId = req.userId;

      // Validate required fields
      if (!name || !loggedInUserId || !createdByModel) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check if the channel already exists
      const isChannelExists = await channelModel.findOne({ name });

      if (isChannelExists) {
        return res.status(400).json({
          status: 400,
          message: "Channel already exists",
        });
      }

      // Create a new channel
      const newChannel = new channelModel({
        name,
        description,
        createdBy: loggedInUserId,
        createdByModel, // 'User' or 'Member'
      });

      await newChannel.save();

      res.status(201).json({
        status: 201,
        message: "Channel created successfully",
        channel: newChannel,
      });
    } catch (error) {
      console.error("Error creating channel:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },




  getChannels: async (req, res) => {
    try {
      console.log("-------- Fetching User Channels ----------");

      const userId = req.userId; // Assuming `userId` is extracted from middleware via JWT

      // Validate the userId
      if (!userId) {
        return res.status(400).json({
          status: 400,
          message: "User ID is required",
        });
      }

      // Fetch channels where the user or member created the channel
      const channels = await channelModel.find({
        createdBy: userId,
        createdByModel: 'User', // Assuming we are fetching channels created by users
      }).select('name description createdAt'); // Adjust fields based on what you need to return

      // Return the fetched channels
      res.status(200).json({
        status: 200,
        message: "Channels fetched successfully",
        channels,
      });
    } catch (error) {
      console.error("Error fetching channels:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },


  getChannelMembers: async (req, res) => {
    try {

      const userId = req.userId; // Extracted from JWT middleware
      const { channelId } = req.query;
      console.log('fetching channeld : ', channelId, userId);
      // console.log(channelId);

      // Step 1: Find all members in channels created by the logged-in user
      const channelMembers = await channelMemberModel
        .find({ addedBy: userId, channelId: channelId })
        .populate("channelId", "name description") // Populate channel details
        .populate("memberId") // Populate member details
        // .select("channelId memberId role addedBy addedByModel joinedAt "); // Select specific fields
      console.log('channelMembers', channelMembers);

      // const channelMembers_ = await channelMemberModel
      //   .find({ id: channelId })
      // console.log('channelMembers_', channelMembers_);


      if (!channelMembers.length) {
        return res.status(404).json({
          status: 404,
          message: "No members found for channels added by the user.",
        });
      }

      // Step 2: Format the response data
      const result = channelMembers
      .filter((channelMember) => channelMember.memberId?._id) // Filter out entries where memberId is null or undefined
      .map((channelMember) => ({
        channelId: channelMember.channelId?._id,
        channelName: channelMember.channelId?.name,
        channelDescription: channelMember.channelId?.description,
        memberId: channelMember.memberId?._id, // Ensure you're accessing the memberId properly
        memberName: channelMember.memberId?.name,
        memberEmail: channelMember.memberId?.email,
        memberMobile: channelMember.memberId?.mobile,
        role: channelMember.role,
        addedBy: channelMember.addedBy,
        addedByModel: channelMember.addedByModel,
        joinedAt: channelMember.joinedAt,
      }));
    

      res.status(200).json({
        status: 200,
        message: "Members fetched successfully.",
        data: channelMembers,
        totalMembers: result.length,
      });
    } catch (error) {
      console.error("Error fetching channel members:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },






  addMemberToChannel: async (req, res) => {
    try {
      console.log("-------- Adding member to channel --------");

      const { channelId, memberId, role, addedByModel } = req.body;
      const loggedInUserId = req.userId;

      // Validate required fields
      if (!channelId || !memberId || !loggedInUserId || !addedByModel) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check if the channel exists
      const channel = await channelModel.findById(channelId);
      if (!channel) {
        return res.status(404).json({ message: "Channel not found" });
      }

      // Validate the role (optional if enum ensures it)
      const validRoles = ['admin', 'member', 'user'];
      if (role && !validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role specified" });
      }

      // Check if the member already exists in the channel
      const isMemberExists = await channelMemberModel.findOne({ channelId, memberId });
      if (isMemberExists) {
        return res.status(400).json({ message: "Member already exists in the channel" });
      }

      // Create a new channel member
      const newChannelMember = new channelMemberModel({
        channelId,
        memberId,
        role: role || 'member',
        addedBy: loggedInUserId,
        addedByModel,
        joinedAt: new Date(),
      });

      await newChannelMember.save();

      res.status(201).json({
        status: 201,
        message: "Member added to channel successfully",
        channelMember: newChannelMember,
      });
    } catch (error) {
      console.error("Error adding member to channel:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },






  // Controller to get the attendance data
  getChannelAttendance: async (req, res) => {
    try {
      // Get the date range from query parameters (if provided)
      const { startDate, endDate } = req.query;

      // Get the current date (start of the day for today)
      const todayStart = moment().startOf('day').toDate();
      const todayEnd = moment().endOf('day').toDate();

      // Prepare the date range query
      let dateFilter = {};

      if (startDate && endDate) {
        // If start and end date are provided in query params, use them
        dateFilter.createdAt = {
          $gte: moment(startDate).startOf('day').toDate(),
          $lte: moment(endDate).endOf('day').toDate()
        };
      } else {
        // If no date range is provided, fetch today's data
        dateFilter.createdAt = {
          $gte: todayStart,
          $lte: todayEnd
        };
      }
      console.log('dateFilter', dateFilter);

      // Fetch the attendance data using the date filter
      const attendanceData = await attendanceModel.find(dateFilter)
        // .populate('member', 'name email') // Populate member details (optional)
        // .populate('parentId', 'name') // Populate user (parent) details (optional)
        .sort({ createdAt: -1 }); // Sort by latest attendance

      // Return the fetched data
      res.status(200).json({
        success: true,
        data: attendanceData,
        count: attendanceData.length
      });
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      res.status(500).json({
        success: false,
        message: "Server Error"
      });
    }
  }



}




