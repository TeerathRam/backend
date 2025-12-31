import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { Comment } from "../models/comment.models.js";
import { Like } from "../models/like.models.js";
import { Playlist } from "../models/playlist.models.js";
import {
  uploadOnCloudinary,
  deleteFileOnCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  const options = {
    skip: (parseInt(page) - 1) * parseInt(limit),
    limit: parseInt(limit),
    sort: [{ sortBy, sortType }],
  };

  //creating database query based on user query
  if (query) {
    options.criteria = {
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ],
    };
  }

  if (userId) {
    if (options.criteria) {
      options.criteria = { $and: [options.criteria, { owner: userId }] };
    } else {
      //query for user videos based on userId if query not provided
      options.criteria = { owner: userId };
    }
  }

  const videos = await Video.find(options);

  const response = new ApiResponse(200, videos, "Videos fetched successfully.");

  if (!videos) {
    response.message = "Videos related to given query not found.";
  }

  return res.status(200).json(response);
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!(title && description)) {
    throw new ApiError(400, "Title and description is required.");
  }

  let videoLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.videoFile) &&
    req.files.videoFile.length > 0
  ) {
    videoLocalPath = req.files.videoFile[0]?.path;
  }

  if (!videoLocalPath) {
    throw new ApiError(400, "Video file is required.");
  }

  let thumbnailLocalPth;
  if (
    req.files &&
    Array.isArray(req.files.thumbnail) &&
    req.files.thumbnail.length > 0
  ) {
    thumbnailLocalPth = req.files.thumbnail[0]?.path;
  }

  if (!thumbnailLocalPth) {
    throw new ApiError(400, "Thumbnail file is required.");
  }

  const videoFile = await uploadOnCloudinary(videoLocalPath);
  if (!videoFile.secure_url) {
    throw new ApiError(
      400,
      "Something went wrong while uploading video on cloudinary."
    );
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPth);
  if (!thumbnail.secure_url) {
    throw new ApiError(
      400,
      "Something went wrong while uploading video thumbnail on cloudinary."
    );
  }

  try {
    const video = await Video.create({
      title,
      description,
      duration: videoFile?.duration,
      videoFile: videoFile?.secure_url,
      thumbnail: thumbnail?.secure_url,
      owner: req.user?._id,
    });

    if (!video) {
      throw new ApiError(400, "Error while publishing video.");
    }

    return res
      .status(201)
      .json(new ApiResponse(201, video, "Video created successfully."));
  } catch (error) {
    await deleteFileOnCloudinary(videoFile?.secure_url, "video");
    await deleteFileOnCloudinary(thumbnail?.secure_url, "image");
    throw new ApiError(500, "Error while creating video.");
  }
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId?.trim() || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id.");
  }

  // check if video exists
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video with given id not found.");
  }

  // only increment views if video owner is not the user
  if (video.owner.toString() !== req.user?._id.toString()) {
    await Video.findByIdAndUpdate(
      video?._id,
      {
        $inc: {
          views: 1,
        },
      },
      { new: true }
    );
  }

  // get video details
  const updatedVideo = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(video?._id),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        isLiked: {
          $in: [req.user?._id, "$likes.likedBy"],
        },
        owner: {
          $first: "$owner",
        },
        likes: {
          $sum: "$likes",
        },
      },
    },
  ]);

  // update user watch history
  await User.findByIdAndUpdate(
    req.user?._id,
    {
      $push: {
        watchHistory: video?._id,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo[0], "Video fetched successfully."));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId?.trim() || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id.");
  }

  // check if video exists
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video with this id is not found.");
  }

  // check user authorization
  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this video.");
  }

  const { title, description } = req.body;
  if (!(title && description)) {
    throw new ApiError(400, "Tittle and discription is required.");
  }

  let thumbnailLocalPth;
  if (req.file !== "") {
    thumbnailLocalPth = req.file?.path;
  }

  if (!thumbnailLocalPth) {
    throw new ApiError(400, "Thumbnail file is required.");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPth);
  if (!thumbnail.secure_url) {
    throw new ApiError(400, "Error while uploading thumbnail on cloudinary.");
  }

  // update video
  try {
    await Video.findByIdAndUpdate(
      videoId,
      {
        $set: {
          title,
          description,
          thumbnail: thumbnail?.secure_url,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, updatedVideo, "Video updated successfully."));
  } catch (error) {
    await deleteFileOnCloudinary(thumbnail?.secure_url, "image");
    throw new ApiError(500, "Error while updating video.");
  }
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId?.trim() || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id.");
  }

  // check if video exists
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video with this id is not found.");
  }

  // check user authorization
  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this video.");
  }

  const deleteVideo = await Video.findByIdAndDelete(video?._id);

  if (!deleteVideo) {
    throw new ApiError(500, "Error while deleting the video.");
  }

  const deleteThumbnailOnCloudinary = await deleteFileOnCloudinary(
    deleteVideo?.thumbnail,
    "image"
  );

  if (!deleteThumbnailOnCloudinary) {
    throw new ApiError(
      501,
      "Error while removing thumbnail file from cloudinary."
    );
  }

  const deleteVideoOnCloudinary = await deleteFileOnCloudinary(
    deleteVideo?.videoFile,
    "video"
  );

  if (!deleteVideoOnCloudinary) {
    throw new ApiError(501, "Error while removing video file on cloudinary.");
  }

  //remove video from all users watch history
  await User.updateMany(
    { watchHistory: video?._id },
    {
      $pullAll: {
        watchHistory: [video?._id],
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  // delete video likes
  await Like.deleteMany({ video: video._id });

  // find video comments and delete comments likes
  const videoComments = await Comment.find({ video: video._id });
  for (const comment of videoComments) {
    await Like.deleteMany({
      comment: comment._id,
    });
  }

  // delete video comments
  await Comment.deleteMany({ video: video._id });

  //remove video from users playlist
  await Playlist.updateMany(
    { video: video._id },
    {
      $pullAll: {
        video: [video._id],
      },
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Vidoe deleted successfully."));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId?.trim() || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id.");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found.");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this video.");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublished: !video.isPublished,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideo, "Publish status updated successfully.")
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
