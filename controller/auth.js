const userModel = require("../user/models/profile");
const memberModel = require('../member/models/profile'); // Import the User model
const jwt = require('jsonwebtoken');
const bcrypt = require("bcryptjs");
const { checkEncryptedPassword } = require('../util/auth');
const channelModel = require("../model/channels");



//==================================================
const generateToken = (id, type) => {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not set in environment variables.");
    throw new Error("Internal server error. Missing environment configuration.");
  }

  return jwt.sign({ userId: id, type }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const sendErrorResponse = (res, status, message) => {
  return res.status(status).json({ status, message });
}

const handleUserLogin = async (email, password, res) => {
  const user = await userModel.findOne({ email });

  if (!user) {
    return sendErrorResponse(res, 404, "User not found");
  }

  if (!user.isSubscribed) {
    return sendErrorResponse(res, 401, "Your free trial has expired.");
  }

  const isPasswordValid = await checkEncryptedPassword(password, user.password);
  if (!isPasswordValid) {
    return sendErrorResponse(res, 401, "Invalid password.");
  }

  const token = generateToken(user._id, "user");

  return res.status(200).json({
    status: 200,
    type: "user",
    message: "User authenticated successfully.",
    token,
  });
}

const handleMemberLogin = async (email, password, res) => {
  const member = await memberModel.findOne({ email });

  if (!member) {
    return null; // Allow fallback to user logic
  }

  const isPasswordValid = await checkEncryptedPassword(password, member.password);
  if (!isPasswordValid) {
    return sendErrorResponse(res, 401, "Invalid password.");
  }

  if (!member.isApproved) {
    return sendErrorResponse(res, 401, "Member is not verified. Please verify your email.");
  }

  const token = generateToken(member._id, "member");

  return res.status(200).json({
    status: 200,
    type: "member",
    message: "Member authenticated successfully.",
    token,
  });
}
//==================================================


module.exports = {

  signup: async (req, res) => {
    try {
      console.log("--------  started User signup ----------");

      const { name, email, password, mobile, fcmToken } = req.body;

      // Validate input
      if (!name) {
        return res.status(400).json({
          status: 400,
          message: "Name is required"
        });
      }

      if (!email) {
        return res.status(400).json({
          status: 400,
          message: "Email is required"
        });
      }

      if (!password) {
        return res.status(400).json({
          status: 400,
          message: "Password is required"
        });
      }

      if (!mobile) {
        return res.status(400).json({
          status: 400,
          message: "Mobile number is required"
        });
      }

      // Check if the user already exists
      const existingUser = await userModel.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          status: 409,
          message: "User already registered"
        });
      }

      // Hash the password before saving
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create a new user
      const newUser = new userModel({
        name,
        email,
        fcmToken,
        mobile,
        password: hashedPassword,
        createdBy: "system", // or replace with appropriate user ID if needed
        updatedBy: "system",
      });

      // Save the user to the database
      await newUser.save();

      // Generate a JWT token with 2 hours expiry
      const token = jwt.sign(
        { userId: newUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '360m' } // Token expires in 2 hours
      );

      // Create default channels
      const defaultChannels = [
        { name: 'IT', description: 'Default IT channel' },
        { name: 'HR', description: 'Default HR channel' },
        { name: 'SALES', description: 'Default Sales channel' },
      ];

      const channelPromises = defaultChannels.map(channel => {
        return new channelModel({
          ...channel,
          createdBy: newUser._id,
          createdByModel: 'User',
        }).save();
      });

      await Promise.all(channelPromises);

      // Send response with the token
      res.status(201).json({
        status: 201,
        message: "User registered successfully",
        token,
      });

    } catch (error) {
      console.error("Error during user signup:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },


  // login: async (req, res) => {
  //   try {
  //     console.log("--------  started User login ----------");

  //     const { email, password } = req.body;

  //     if (!email) {
  //       return res.status(400).json({
  //         status: 400,
  //         message: "Email is required"
  //       });
  //     }

  //     if (!password) {
  //       return res.status(400).json({
  //         status: 400,
  //         message: "Password is required"
  //       });
  //     }

  //     // Find the user by email
  //     const user = await userModel.findOne({ email });
  //     console.log(' user ---- ?', user);
  //     // if (!user) {
  //     //   return res.status(404).json({
  //     //     status: 404,
  //     //     message: "User not found"
  //     //   });
  //     // }

  //     try {
  //       // Check if user exists
  //       if (!user) {
  //         return res.status(404).json({
  //           status: 404,
  //           message: "User not found",
  //         });
  //       }

  //       // Check subscription status
  //       if (user.isSubscribed === false) {
  //         return res.status(401).json({
  //           status: 401,
  //           message: "Your free trial has expired.",
  //         });
  //       }

  //       // Validate password
  //       const isPasswordValid = await checkEncryptedPassword(password, user.password);
  //       if (!isPasswordValid) {
  //         return res.status(401).json({
  //           status: 401,
  //           message: "Invalid password.",
  //         });
  //       }

  //       // Ensure JWT_SECRET is set
  //       if (!process.env.JWT_SECRET) {
  //         console.error("JWT_SECRET is not set in environment variables.");
  //         return res.status(500).json({
  //           status: 500,
  //           message: "Internal server error. Please contact support.",
  //         });
  //       }

  //       // Generate JWT token
  //       const token = jwt.sign(
  //         { userId: user._id },
  //         process.env.JWT_SECRET,
  //         { expiresIn: '360m' }
  //       );

  //       console.log('Login token:', token);

  //       // Send success response with token
  //       return res.status(200).json({
  //         status: 200,
  //         type: "user",
  //         message: "User authenticated successfully.",
  //         token,
  //       });

  //     } catch (error) {
  //       console.error("Error during login:", error);

  //     }


  //     // If not found in User, check in the Member collection
  //     const member = await memberModel.findOne({ email });
  //     console.log(email, member);
  //     console.log('verified ?', member?.isApproved);

  //     if (member) {
  //       const isPasswordValid = await checkEncryptedPassword(password, member?.password);
  //       if (!isPasswordValid) {
  //         return res.status(401).json({
  //           status: 401,
  //           message: "Invalid password"
  //         });
  //       }

  //       if (!member?.isApproved) {
  //         return res.status(401).json({
  //           status: 401,
  //           error: "User is not verified",
  //           message: "Member need to verify the email"
  //         });
  //       }

  //       const token = jwt.sign({ userId: member._id }, process.env.JWT_SECRET, { expiresIn: '360m' });

  //       // Send response with the token
  //       return res.status(200).json({
  //         status: 200,
  //         message: "Member authenticated successfully",
  //         type: "member",
  //         token
  //       });
  //     }

  //     // If neither a user nor member is found
  //     return res.status(401).json({
  //       status: 401,
  //       message: "User is not registered with DigiCare"
  //     });

  //   } catch (error) {
  //     res.status(500).json({ error: error });
  //   }
  // },










  // const jwt = require('jsonwebtoken');
  // const userModel = require('../models/userModel');
  // const memberModel = require('../models/memberModel');
  // const { checkEncryptedPassword } = require('../utils/passwordUtils');


  login: async (req, res) => {
    try {
      console.log("-------- Started User login ----------");

      const { email, password } = req.body;

      if (!email || !password) {
        return sendErrorResponse(res, 400, "Email and password are required.");
      }

      // First, try logging in as a member
      const memberResponse = await handleMemberLogin(email, password, res);
      if (memberResponse) return memberResponse;

      // If no member is found, try logging in as a user
      await handleUserLogin(email, password, res);

    } catch (error) {
      console.error("Error during login:", error.message);
      return res.status(500).json({
        status: 500,
        message: "An unexpected error occurred. Please try again later.",
      });
    }
  },
  handleFcmToken: async (req, res) => {
    try {
      console.log("-------- Started handleFcmToken ----------");
  
      const { email, password } = req.body;
  
      if (!email || !password) {
        return sendErrorResponse(res, 400, "Email and password are required.");
      }
  
      // Check if the user is a member
      const member = await memberModel.findOne({ email });
      if (member && (await checkEncryptedPassword(password, member.password))) {
        req.userId = member._id;
        return res.status(200).json({
          status: 200,
          message: "Login successful.",
          userId: member._id,
          fcmToken: member.fcmToken,
          type: "member",
        });
      }
  
      // Check if the user is a user
      const user = await userModel.findOne({ email });
      if (user && ( await checkEncryptedPassword(password, user.password)    )) {
        req.userId = user._id;
        return res.status(200).json({
          status: 200,
          message: "Login successful.",
          userId: user._id,
          fcmToken: user.fcmToken,

          type: "user",
        });
      }
  
      // If no user or member is found
      return sendErrorResponse(res, 401, "Invalid email or password.");
    } catch (error) {
      console.error("Error during login:", error.message);
      return res.status(500).json({
        status: 500,
        message: "An unexpected error occurred. Please try again later.",
      });
    }
  }  ,
  handleFcmTokenUpdate: async (req, res) => {
    try {
      console.log("-------- Started handleFcmToken ----------");
  
      const { email, password, fcmToken } = req.body;
  
      if (!email || !password) {
        return res.status(400).json({
          status: 400,
          message: "Email and password are required.",
        });
      }
  
      if (!fcmToken) {
        return res.status(400).json({
          status: 400,
          message: "FCM token is required.",
        });
      }
  
      // Check if the user is a member
      const member = await memberModel.findOne({ email });
      if (member && (await checkEncryptedPassword(password, member.password))) {
        // Update the FCM token if it's different
        if (member.fcmToken !== fcmToken) {
          member.fcmToken = fcmToken;
          await member.save();
          console.log("Member FCM token updated");
        }
  
        return res.status(200).json({
          status: 200,
          message: "Login successful.",
          userId: member._id,
          fcmToken: member.fcmToken,
          type: "member",
        });
      }
  
      // Check if the user is a user
      const user = await userModel.findOne({ email });
      if (user && (await checkEncryptedPassword(password, user.password))) {
        // Update the FCM token if it's different
        if (user.fcmToken !== fcmToken) {
          user.fcmToken = fcmToken;
          await user.save();
          console.log("User FCM token updated");
        }
  
        return res.status(200).json({
          status: 200,
          message: "Login successful.",
          userId: user._id,
          fcmToken: user.fcmToken,
          type: "user",
        });
      }
  
      // If no user or member is found
      return res.status(401).json({
        status: 401,
        message: "Invalid email or password.",
      });
    } catch (error) {
      console.error("Error during login:", error.message);
      return res.status(500).json({
        status: 500,
        message: "An unexpected error occurred. Please try again later.",
      });
    }
  }
  
  
}













