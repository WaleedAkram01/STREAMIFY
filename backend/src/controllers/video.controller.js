import mongoose from "mongoose";
import { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  uploadVideoOnCloudinary,
  uploadImageBufferOnCloudinary,
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { Video } from "../models/video.models.js";

// HELPER FUNCTION: Seconds ko "MM:SS" format mein convert karne ke liye
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
    videoUploadResult.eager && videoUploadResult.eager[0]
      ? videoUploadResult.eager[0].secure_url
      : videoUploadResult.secure_url;

  let finalThumbnailUrl = "";
  let finalThumbnailPublicId = "";

  if (thumbnailFile && thumbnailFile.buffer) {
    const customThumbResult = await uploadImageBufferOnCloudinary(
      thumbnailFile.buffer,
    );

    if (customThumbResult) {
      finalThumbnailUrl = customThumbResult.secure_url;
      finalThumbnailPublicId = customThumbResult.public_id;
    }
  }

  if (!finalThumbnailUrl) {
    finalThumbnailUrl = videoUploadResult.secure_url.replace(
      /\.[^/.]+$/,
      ".jpg",
    );

    finalThumbnailPublicId = videoUploadResult.public_id;
  }

  const rawSeconds = videoUploadResult.duration
    ? Number(videoUploadResult.duration)
    : 0;

  const formattedDurationText = formatDuration(rawSeconds);

  const video = await Video.create({
    title,
    description,
    videoFile: hlsStreamingUrl,
    thumbnail: {
      url: finalThumbnailUrl,
      publicId: finalThumbnailPublicId,
    },
    duration: formattedDurationText,
    isPublished: true,
    owner: req.user?._id,
  });

  if (!video) {
    throw new ApiError(500, "Error while saving video document");
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

// GET ALL VIDEOS CONTROLLER (Infinite Scroll & Search)
export const getAllVideos = asyncHandler(async (req, res) => {
  // Query parameters se filters aur cursor nikalna
  const { query, sortBy = "createdAt", nextId, limit = 10 } = req.query;
  const limitValue = parseInt(limit, 10);

  // Advanced Aggregation Pipeline for infinite scroll matching and population
  const videos = await Video.aggregate([
    {
      // Stage 1: Filter out inactive videos, apply search queries, and slice using cursor ID
      $match: {
        isPublished: true,
        // Safe Text Search: Dynamic evaluation if search text is provided
        ...(query?.trim() && {
          $or: [
            { title: { $regex: query.trim(), $options: "i" } },
            { description: { $regex: query.trim(), $options: "i" } },
          ],
        }),
        // Infinite Scroll Logic: Fetch only items older than the received cursor ID
        ...(nextId?.trim() && {
          _id: { $lt: new mongoose.Types.ObjectId(nextId.trim()) },
        }),
      },
    },
    {
      // Stage 2: Sort order handling sequence (Latest uploaded videos appear first)
      $sort: {
        [sortBy]: -1,
        _id: -1, // Tie-breaker sort order maintaining index stability
      },
    },
    {
      // Stage 3: Fetch one extra item (limit + 1) to securely evaluate if more data exists
      $limit: limitValue + 1,
    },
    {
      // Stage 4: Look up corresponding creator profile attributes inside users collection
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    {
      // Stage 5: Flatten out populated matrix array wrappers safely into clean object layouts
      $unwind: {
        path: "$ownerDetails",
        preserveNullAndEmptyArrays: true, // Prevents total structural crashes if an owner profile is missing
      },
    },
    {
      // Stage 6: Project structured output fields and filter sensitive credentials out
      $project: {
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        duration: 1,
        views: 1,
        isPublished: 1,
        createdAt: 1,
        updatedAt: 1,
        ownerDetails: {
          _id: 1,
          username: 1,
          fullName: 1,
          avatar: 1,
        },
      },
    },
  ]);

  // Infinite scroll payload calculations
  const hasNextPage = videos.length > limitValue;

  // If extra checker boundary record was loaded, remove it from standard video layout array
  if (hasNextPage) {
    videos.pop();
  }

  // Generate the next query target tracking anchor key using standard array index position
  const nextCursor = videos.length > 0 ? videos[videos.length - 1]._id : null;

  // Formatting final payload according to standard API structures
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos,
        pageInfo: {
          nextCursor,
          hasNextPage,
        },
      },
      "Videos fetched successfully for infinite scroll",
    ),
  );
});

// update video details like title, description, thumbnail
export const updateVideo = asyncHandler(async (req, res) => {
  console.log(req.body);
  const { title, description } = req.body;
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  if (!(title && description)) {
    throw new ApiError(400, "title and description are required");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "No video found");
  }

  if (video?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      400,
      "You can't edit this video as you are not the owner",
    );
  }

  //deleting old thumbnail and updating with new one
  const thumbnailToDelete = video.thumbnail.public_id;

  const thumbnailLocalPath = req.file?.path;

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "thumbnail is required");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!thumbnail) {
    throw new ApiError(400, "thumbnail not found");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: {
          public_id: thumbnail.public_id,
          url: thumbnail.url,
        },
      },
    },
    { new: true },
  );

  if (!updatedVideo) {
    throw new ApiError(500, "Failed to update video please try again");
  }

  if (updatedVideo) {
    await deleteFromCloudinary(thumbnailToDelete);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});
