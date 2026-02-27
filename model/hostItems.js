import mongoose from "mongoose";

const hostItemSchema = new mongoose.Schema({
    itemTitle: {
        type: String,
        required: true,
    },
    selectCategory: {
        type: String,
        required: true,
    },
    desiredNetPayout: {
        type: Number,
        required: true,
    },
    selectTimeline: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    

},{timestamps: true, createdAt: true});
export default mongoose.model("hostItem", hostItemSchema)