const mongoose = require("mongoose");

//===================================
const userSchema = new mongoose.Schema({
  name: String,
  role: { type: String, enum: ['super-admin', 'user', 'member'], default: 'user' },
  members: { type: mongoose.Schema.Types.ObjectId, ref: 'member' }, // User who added this member
  userType: { type: String, default: 'user' },

  email: { type: String, unique: true },
  mobile: String,
  password: String,



  location: {
    type: {
      type: String,
      enum: ['Point'], // 'Point' for 2D sphere indexing
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      default: [0.0, 0.0]
    },
    updatedAt: { type: Date, default: Date.now },
  },








  groupType: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: false }, // Reference to Channel schema

  // groupType: { type: String, default: 'none' },
  isSubscribed: { type: Boolean, default: true },

  isDeleted: { type: Boolean, default: false },
  createdBy: { type: String, default: "system" },
  updatedBy: { type: String, default: "system" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },




});

// Update updatedAt field before saving
userSchema.pre('save', function (next) {
  // console.log('======= MONGOOSE middleware ------>');

  this.updatedAt = Date.now();
  next();
});

const userModel = mongoose.model('user', userSchema);
module.exports = userModel;

