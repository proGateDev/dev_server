const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    locationName: {
        type: String,
        required: true,
    },
    coordinates: {
        lat: {
            type: Number,
            required: true,
        },
        lng: {
            type: Number,
            required: true,
        },
    },
    assignedAt: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['Pending', 'Completed'],
        default: 'Pending',
    },
    // Optional field for tracking if the member entered or exited the assigned location
    entryTime: Date,
    exitTime: Date,
});


const assignmentModel = mongoose.model('assignment', assignmentSchema);
module.exports = assignmentModel;
