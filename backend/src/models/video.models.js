import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"; // Pagination ke liye plugin

const videoSchema = new Schema(
  {
    videoFile: {
      type: String, // Cloudinary ka secure URL
      required: [true, "Video file is required"], // Required lagana zaroori hai
    },
    // thumbnail: {
    //   type: String, // Cloudinary ka secure URL
    //   required: [true, "Thumbnail is required"], // Required lagana zaroori hai
    // },

    thumbnail: {
      url: {
        type: String, // Cloudinary ka secure URL yahan save hoga
        required: [true, "Thumbnail image URL is required"], // Custom message agar thumbnail URL missing ho
        trim: true, // Agar link me koi space ho toh remove ho jaye
      },
      publicId: {
        type: String,
        required: [true, "Thumbnail public ID is required"], // Cloudinary ki public ID ke liye
        trim: true,
      },
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // Har video ka koi na koi owner zaroori hona chahiye
    },
    title: {
      type: String,
      required: [true, "Video title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"], // Description bhi professional apps me required hoti hai
      trim: true,
    },
    duration: {
      type: String, // Cloudinary se milne wali duration string ko store karenge
      required: [true, "Video duration is required"],
    },
    views: {
      type: Number,
      default: 0, // Shuru me views hamesha 0 honge
    },
    isPublished: {
      type: Boolean,
      default: true, // Professional apps me video direct publish (true) hoti hai.
    },
  },
  { timestamps: true },
);

// 🔌 Yeh plugin lagane se aap advanced search aur pagination (page 1, page 2) bohot aasani se kar sakenge
videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
