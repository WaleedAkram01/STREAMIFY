import mongoose, { Schema } from "mongoose";

const likeSchema = new Schema(
  {
    video: {
      type: Schema.Types.ObjectId, //123456789qwertyu
      ref: "Video",
    },
    comment: {
      type: Schema.Types.ObjectId, //123456789qwertyu
      ref: "Comment",
    },
    tweet: {
      type: Schema.Types.ObjectId, //123456789qwertyu
      ref: "Tweet",
    },
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

export const Like = mongoose.model("Like", likeSchema);
