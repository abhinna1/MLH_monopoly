const mongoose = require("mongoose");

// Schema for a Monopoly task/assignment
// Fields:
// - name: short title of the task
// - weight: numeric weight (e.g., probability, importance, or relative frequency)
// - position: integer position on the Monopoly board (0-39 typical)
// - description: optional longer text
// - createdBy: optional reference to a User document

const taskSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
			index: true,
		},

		weight: {
			type: Number,
			required: true,
			default: 1,
			min: 0,
		},

		position: {
			type: Number,
			required: true,
			min: 0,
		},

		description: {
			type: String,
		},

		// optional: reference to a user who created/owns the task
		createdBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		},
	},
	{
		timestamps: true, // adds createdAt and updatedAt
	}
);

// Example static helper: find tasks by board position
taskSchema.statics.findByPosition = async function (pos) {
	return this.find({ position: pos }).sort({ weight: -1, name: 1 }).exec();
};

module.exports = mongoose.model("Task", taskSchema);

