const mongoose = require("mongoose");

// Define location history schema
const locationHistorySchema = new mongoose.Schema({
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'member' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },

  // Use geospatial data for tracking locations
  location: {
    type: {
      type: String,
      enum: ['Point'], // 'Point' for 2D sphere indexing
      required: false,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },

  // Add address fields to the schema
  preferredAddress: { type: String, default: 'NOT FOUND' },
  address: { type: String, default: 'NOT FOUND' },
  locality: { type: String, default: 'NOT FOUND' },
  street: { type: String, default: 'NOT FOUND' },
  neighborhood: { type: String, default: 'NOT FOUND' },
  region: { type: String, default: 'NOT FOUND' },
  district: { type: String, default: 'NOT FOUND' },
  country: { type: String, default: 'NOT FOUND' },
  postcode: { type: String, default: 'NOT FOUND' },
  landmarks: { type: Array, default: [] },

  timestamp: { type: Date, default: Date.now },
});

// Create a 2dsphere index for efficient geospatial queries
locationHistorySchema.index({ location: '2dsphere' });

const trackingHistoryModel = mongoose.model('trackingHistory', locationHistorySchema);
module.exports = trackingHistoryModel;
