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
import { Comment } from "../models/comment.model.js";
import { User } from "../models/user.models.js";
import { Like } from "../models/like.model.js";
import { Playlist } from "../models/playlist.model.js";
import { DEFAULT_PAGE_LIMIT, MAX_PAGE_LIMIT } from "../utils/constants.js";

// HELPER: user ka search text regex mein safe banane ke liye (special chars escape)
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// HELPER FUNCTION: Seconds ko "MM:SS" format mein convert karne ke liye
const formatDuration = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

// GET ALL VIDEOS CONTROLLER (Infinite Scroll & Search)
export const getAllVideos = asyncHandler(async (req, res) => {
  // Query parameters se filters aur cursor nikalna
  const { query, nextId, userId, limit = DEFAULT_PAGE_LIMIT } = req.query;
  // limit ko 1..MAX_PAGE_LIMIT ke beech rakhein
  const limitValue = Math.min(
    Math.max(parseInt(limit, 10) || DEFAULT_PAGE_LIMIT, 1),
    MAX_PAGE_LIMIT,
  );

  // Cursor (nextId) valid ObjectId hona chahiye, warna 500 crash hota tha
  if (nextId?.trim() && !isValidObjectId(nextId.trim())) {
    throw new ApiError(400, "Invalid nextId cursor");
  }

  // Optional: sirf kisi aik channel (owner) ki videos (channel page ke liye)
  if (userId?.trim() && !isValidObjectId(userId.trim())) {
    throw new ApiError(400, "Invalid userId");
  }

  const searchText = query?.trim() ? escapeRegex(query.trim()) : "";

  // Advanced Aggregation Pipeline for infinite scroll matching and population
  const videos = await Video.aggregate([
    {
      // Stage 1: Filter out inactive videos, apply search queries, and slice using cursor ID
      $match: {
        isPublished: true,
        ...(userId?.trim() && {
          owner: new mongoose.Types.ObjectId(userId.trim()),
        }),
        // Safe Text Search: Dynamic evaluation if search text is provided
        ...(searchText && {
          $or: [
            { title: { $regex: searchText, $options: "i" } },
            { description: { $regex: searchText, $options: "i" } },
          ],
        }),
        // Infinite Scroll Logic: Fetch only items older than the received cursor ID
        ...(nextId?.trim() && {
          _id: { $lt: new mongoose.Types.ObjectId(nextId.trim()) },
        }),
      },
    },
    {
      // Stage 2: Latest videos pehle. Cursor (_id $lt) sirf _id/createdAt order ke saath
      // sahi kaam karta hai, isliye sortBy query param yahan use nahi hota
      $sort: {
        _id: -1,
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
          "avatar.url": 1,
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

  // eager_async mein eager[0].secure_url foran nahi milta, isliye fallback zaroori hai
  const hlsStreamingUrl =
    videoUploadResult.eager?.[0]?.secure_url || videoUploadResult.secure_url;

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
    title: title.trim(),
    description: description.trim(),
    videoFile: hlsStreamingUrl,
    videoPublicId: videoUploadResult.public_id,
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

// GET VIDEO BY ID CONTROLLER (For Video Details Page)
// We will extracct video, owner, likes, comments, and other details using aggregation pipeline
export const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    //1st pipeline:- Iss sy video k sath like aain  gy
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    //2nd pipeline:- Iss sy video kii owner k sath user ka data aayega
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribersCount: {
                $size: "$subscribers",
              },
              isSubscribed: {
                $cond: {
                  if: {
                    $in: [req.user?._id, "$subscribers.subscriber"],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              username: 1,
              fullName: 1,
              "avatar.url": 1,
              subscribersCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        videoFile: 1, // videoFile plain string URL hai ("videoFile.url" kuch return nahi karta tha)
        "thumbnail.url": 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        isPublished: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
      },
    },
  ]);

  // aggregate hamesha array deta hai, isliye length check karna zaroori hai
  if (!video.length) {
    throw new ApiError(404, "Video not found");
  }

  // Unpublished video sirf owner dekh sakta hai
  if (
    !video[0].isPublished &&
    video[0].owner?._id?.toString() !== req.user?._id.toString()
  ) {
    throw new ApiError(404, "Video not found");
  }

  // increment views if video fetched successfully
  await Video.findByIdAndUpdate(videoId, {
    $inc: {
      views: 1,
    },
  });

  // add this video to user watch history
  await User.findByIdAndUpdate(req.user?._id, {
    $addToSet: {
      watchHistory: videoId,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "video details fetched successfully"));
});

// UPDATE VIDEO CONTROLLER (title, description, thumbnail — sab optional, kam az kam aik zaroori)
export const updateVideo = asyncHandler(async (req, res) => {
  // 1. Input nikalna
  const { title, description } = req.body;
  const { videoId } = req.params;
  const thumbnailLocalPath = req.file?.path;

  // 2. Validation
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  if (!title?.trim() && !description?.trim() && !thumbnailLocalPath) {
    throw new ApiError(
      400,
      "Provide at least one of title, description or thumbnail to update",
    );
  }

  // 3. Video dhoondna
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "No video found");
  }

  // 4. Ownership check -> 403
  if (video.owner?.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You can't edit this video as you are not the owner");
  }

  const updateFields = {};
  if (title?.trim()) updateFields.title = title.trim();
  if (description?.trim()) updateFields.description = description.trim();

  // 5. Pehle NAYI thumbnail upload karo, phir DB update, phir purani delete
  // (pehle delete karne se upload fail hone par purani bhi chali jati)
  const oldThumbnailPublicId = video.thumbnail?.publicId;
  if (thumbnailLocalPath) {
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnail) {
      throw new ApiError(500, "Failed to upload thumbnail to cloud storage");
    }
    updateFields.thumbnail = {
      url: thumbnail.secure_url,
      publicId: thumbnail.public_id,
    };
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: updateFields },
    { new: true, runValidators: true },
  );

  if (!updatedVideo) {
    throw new ApiError(500, "Failed to update video please try again");
  }

  // 6. Purani custom thumbnail delete (auto-generated thumbnail ka publicId video wala hota hai, usko skip)
  if (
    updateFields.thumbnail &&
    oldThumbnailPublicId &&
    oldThumbnailPublicId !== video.videoPublicId
  ) {
    await deleteFromCloudinary(oldThumbnailPublicId);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

// TOGGLE PUBLISH STATUS CONTROLLER
export const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner?.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      403,
      "You can't toggle publish status as you are not the owner",
    );
  }

  const toggledVideoPublish = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video.isPublished,
      },
    },
    { new: true },
  );

  if (!toggledVideoPublish) {
    throw new ApiError(500, "Failed to toggle video publish status");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isPublished: toggledVideoPublish.isPublished },
        "Video publish toggled successfully",
      ),
    );
});

// DELETE VIDEO CONTROLLER
// Video + uski thumbnail/video file (Cloudinary) + likes + comments + playlist entries sab saaf
export const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "No video found");
  }

  if (video.owner?.toString() !== req.user?._id.toString()) {
    throw new ApiError(
      403,
      "You can't delete this video as you are not the owner",
    );
  }

  const videoDeleted = await Video.findByIdAndDelete(video._id);

  if (!videoDeleted) {
    throw new ApiError(500, "Failed to delete the video please try again");
  }

  // Cloudinary cleanup
  const thumbnailPublicId = video.thumbnail?.publicId;
  if (thumbnailPublicId && thumbnailPublicId !== video.videoPublicId) {
    await deleteFromCloudinary(thumbnailPublicId);
  }
  if (video.videoPublicId) {
    await deleteFromCloudinary(video.videoPublicId, "video");
  }

  // Comments ke likes bhi delete karne ke liye pehle comment IDs nikal lo
  const commentIds = await Comment.find({ video: videoId }).distinct("_id");

  await Promise.all([
    // Video ke likes + uske comments ke likes
    Like.deleteMany({
      $or: [{ video: videoId }, { comment: { $in: commentIds } }],
    }),
    // Video ke comments
    Comment.deleteMany({ video: videoId }),
    // Playlists se video hatao
    Playlist.updateMany({ videos: videoId }, { $pull: { videos: videoId } }),
    // Watch history se video hatao
    User.updateMany(
      { watchHistory: videoId },
      { $pull: { watchHistory: videoId } },
    ),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, { videoId }, "Video deleted successfully"));
});
