import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"; // 👈 Pagination plugin import karein

const commentSchema = new Schema(
  {
    content: {
      type: String,
      required: [true, "Comment content cannot be empty"],
      trim: true,
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    // Diagram ke mutabiq createdAt aur updatedAt dates ko automatic manage karne ke liye
    timestamps: true,
  },
);

commentSchema.plugin(mongooseAggregatePaginate);

export const Comment = mongoose.model("Comment", commentSchema);
