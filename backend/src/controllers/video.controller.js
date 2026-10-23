import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  uploadVideoOnCloudinary,
  uploadImageBufferOnCloudinary,
} from "../utils/cloudinary.js";
import { Video } from "../models/video.models.js";

// HELPER FUNCTION: Seconds ko "MM:SS" string mein convert karne ke liye
const formatDuration = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

export const PublishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || title.trim() === "") {
    throw new ApiError(400, "Video title is strictly required");
  }

  if (!description || description.trim() === "") {
    throw new ApiError(400, "Description is strictly required");
  }

  const videoFile = req.files?.video?.[0];
  const thumbnailFile = req.files?.thumbnail?.[0];

  if (!videoFile || !videoFile.buffer) {
    throw new ApiError(400, "Video file is required");
  }

  const videoUploadResult = await uploadVideoOnCloudinary(videoFile.buffer);

  if (!videoUploadResult) {
    throw new ApiError(500, "Failed to upload video to cloud storage");
  }

  const hlsStreamingUrl =
    videoUploadResult.eager && videoUploadResult.eager
      ? videoUploadResult.eager.secure_url
      : videoUploadResult.secure_url;

  let finalThumbnailUrl = "";

  if (thumbnailFile && thumbnailFile.buffer) {
    const customThumbResult = await uploadImageBufferOnCloudinary(
      thumbnailFile.buffer,
    );
    if (customThumbResult) {
      finalThumbnailUrl = customThumbResult.url;
    }
  }

  if (!finalThumbnailUrl) {
    finalThumbnailUrl = videoUploadResult.secure_url.replace(
      /\.[^/.]+$/,
      ".jpg",
    );
  }

  // Raw duration seconds nikalna
  const rawSeconds = videoUploadResult.duration
    ? Number(videoUploadResult.duration)
    : 0;

  // Format conversion: e.g., 127 seconds ban jayenge "02:07"
  const formattedDurationText = formatDuration(rawSeconds);

  // Database Document Creation
  const video = await Video.create({
    title,
    description,
    videoFile: hlsStreamingUrl,
    thumbnail: finalThumbnailUrl,
    duration: formattedDurationText, // FIX HERE: Direct formatted string "02:07" save hogi schema mein
    isPublished: true,
    owner: req.user?._id,
  });

  if (!video) {
    throw new ApiError(500, "Error while saving video document");
  }

  // Response mein direct database data wapis bhej diya bina koi extra key banaye
  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        video,
        "Video published successfully with optimized streaming workflow!",
      ),
    );
});
