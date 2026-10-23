import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  uploadVideoOnCloudinary,
  uploadImageBufferOnCloudinary,
} from "../utils/cloudinary.js";
import { Video } from "../models/video.models.js"; // Aapka model inject kiya

export const PublishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  // 1. Strict Validation Check as per your Schema requirements
  if (!title || title.trim() === "") {
    throw new ApiError(400, "Video title is strictly required");
  }

  if (!description || description.trim() === "") {
    throw new ApiError(
      400,
      "Description is strictly required as per schema configuration",
    );
  }

  // Files validation tracking from memory storage
  const videoFile = req.files?.video?.[0];
  const thumbnailFile = req.files?.thumbnail?.[0];

  if (!videoFile || !videoFile.buffer) {
    throw new ApiError(400, "Video file is required");
  }

  // 2. Heavy Video stream upload pipeline trigger kiya
  const videoUploadResult = await uploadVideoOnCloudinary(videoFile.buffer);

  if (!videoUploadResult) {
    throw new ApiError(500, "Failed to upload video to cloud storage");
  }

  // Cloudinary se master adaptive HLS link extract karna (.m3u8 index map)
  const hlsStreamingUrl =
    videoUploadResult.eager && videoUploadResult.eager[0]
      ? videoUploadResult.eager[0].secure_url
      : videoUploadResult.secure_url;

  // 3. Thumbnail Logic allocation
  let finalThumbnailUrl = "";

  // CASE A: User uploads custom thumbnail image
  if (thumbnailFile && thumbnailFile.buffer) {
    const customThumbResult = await uploadImageBufferOnCloudinary(
      thumbnailFile.buffer,
    );
    if (customThumbResult) {
      finalThumbnailUrl = customThumbResult.url;
    }
  }

  // CASE B: Fallback video snapshot layer allocation
  if (!finalThumbnailUrl) {
    finalThumbnailUrl = videoUploadResult.secure_url.replace(
      /\.[^/.]+$/,
      ".jpg",
    );
  }

  // 4. Strict Schema Verification check for Duration
  // Agar asset duration metadata directly fetch na ho, to safe side fallback default float add kiya
  const videoDuration = videoUploadResult.duration
    ? Number(videoUploadResult.duration)
    : 10.0;

  // 5. Database Document mapping exactly as per your fields
  const video = await Video.create({
    title,
    description, // Directly matching strict validation
    videoFile: hlsStreamingUrl, // Mapping schema secure URL link
    thumbnail: finalThumbnailUrl, // Matching required thumbnail key
    duration: videoDuration, // Mapping float/number sequence required validation
    isPublished: true,
    owner: req.user?._id, // verifyJWT global token session value
  });

  if (!video) {
    throw new ApiError(
      500,
      "Something went wrong while saving video document tracking record",
    );
  }

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
