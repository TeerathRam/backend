import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import {
  uploadOnCloudinary,
  deleteFileOnCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
    sort: {
      [sortBy]: sortType,
    },
  };

  if (query) {
    options.criteria = {
      $or: [
        { tittle: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ],
    };
  }

  if (userId) {
    if (options.criteria) {
      options.criteria = { $and: [options.criteria, { owner: userId }] };
    } else {
      options.criteria = { owner: userId };
    }
  }

  const videos = await Video.paginate(options);

  if (!videos) {
    throw new ApiError(404, "Videos not found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully."));
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
  if (!videoFile.url) {
    throw new ApiError(
      400,
      "Something went wrong while uploading video on cloudinary."
    );
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPth);
  if (!thumbnail.url) {
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
      videoFile: videoFile?.url,
      thumbnail: thumbnail?.url,
      owner: req.user?._id,
    });

    const publishedVideo = await Video.findById(video?._id);

    if (!publishedVideo) {
      throw new ApiError(400, "Error while publishing video.");
    }

    return res
      .status(201)
      .json(
        new ApiResponse(201, publishedVideo, "Video created successfully.")
      );
  } catch (error) {
    await deleteFileOnCloudinary(videoFile?.url);
    await deleteFileOnCloudinary(thumbnail?.url);
    throw new ApiError(500, "error while creating video.");
  }
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId?.trim() || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id.");
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
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
              coverImage: 1,
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
        owner: {
          $first: "$owner",
        },
        totalLiks: {
          $size: "$likes",
        },
      },
    },
  ]);

  if (!video) {
    throw new ApiError(404, "Video with this id is not found.");
  }

  const fetchedVideo = await Video.findByIdAndUpdate(
    video._id,
    {
      $set: {
        views: views++,
      },
    },
    {
      new: true,
    }
  );

  if (!fetchedVideo) {
    throw new ApiError(404, "Error while updating video views.");
  }

  const user = await User.findById(req.user?._id);
  user.watchHistory.push(fetchedVideo._id);
  await user.save({ isNew: false });

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId?.trim() || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  const { title, description } = req.body; // validate every field seperete
  if (!(title || description)) {
    throw new ApiError(400, "Tittle or discription is required");
  }

  let thumbnailLocalPth;
  if (req.file !== "") {
    thumbnailLocalPth = req.file?.path;
  }

  if (!thumbnailLocalPth) {
    throw new ApiError(400, "Thumbnail is required");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPth);
  if (!thumbnail.url) {
    throw new ApiError(400, "Error while uploading thumbnail on cloudinary");
  }

  try {
    const updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      {
        $set: {
          title,
          description,
          thumbnail: thumbnail?.url,
        },
      },
      {
        new: true,
      }
    );

    if (!updatedVideo) {
      throw new ApiError(400, "Error while updating video");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
  } catch (error) {
    await deleteFileOnCloudinary(thumbnail?.url);
    throw new ApiError(500, "Error while updating video");
  }
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId?.trim() || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  const { thumbnail, videoFile } = video;

  const deleteThumbnailOnCloudinary = await deleteFileOnCloudinary(thumbnail);
  if (!deleteThumbnailOnCloudinary) {
    throw new ApiError(
      501,
      "Error while removing  thumbnail file from cloudinary"
    );
  }

  const deleteVideoOnCloudinary = await deleteFileOnCloudinary(videoFile);

  if (!deleteVideoOnCloudinary) {
    throw new ApiError(501, "Error while removing video file on cloudinary");
  }

  const deleteVideo = await Video.findByIdAndDelete(videoId);

  if (!deleteVideo) {
    throw new ApiError(500, "Error while deleting the video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Vidoe deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId?.trim() || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        isPublised: !isPublised,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedVideo) {
    throw new ApiError(500, "Error while updateting toggle status of video");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideo, "Toggle status changed successfully")
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
