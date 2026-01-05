import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Like } from "../models/like.models.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId.trim() || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id.");
  }

  const like = await Like.findOne({
    video: videoId,
    likedBy: req.user._id,
  });

  let newLike = null;
  if (like) {
    await Like.findOneAndDelete({
      video: videoId,
      likedBy: req.user._id,
    });
  } else {
    newLike = await Like.create({
      video: videoId,
      likedBy: req.user._id,
    });

    if (!newLike) {
      throw new ApiError(401, "Error while togglig video like.");
    }
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        newLike,
        "User like on this video toggled successfully."
      )
    );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!commentId.trim() || !isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id.");
  }

  const like = await Like.findOne({
    comment: commentId,
    likedBy: req.user._id,
  });

  let newLike = null;
  if (like) {
    await Like.findOneAndDelete({
      comment: commentId,
      likedBy: req.user._id,
    });
  } else {
    newLike = await Like.create({
      comment: commentId,
      likedBy: req.user._id,
    });

    if (!newLike) {
      throw new ApiError(401, "Error while toggling comment like.");
    }
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        newLike,
        "User like on this comment toggled successfully."
      )
    );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!tweetId.trim() || !isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id.");
  }

  const like = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user._id,
  });

  let newLike = null;
  if (like) {
    await Like.findOneAndDelete({
      tweet: tweetId,
      likedBy: req.user._id,
    });
  } else {
    newLike = await Like.create({
      tweet: tweetId,
      likedBy: req.user._id,
    });

    if (!like) {
      throw new ApiError(401, "Error while toggling tweet like");
    }
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        newLike,
        "User like on this tweet toggled successfully."
      )
    );
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const videos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req?.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
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
            $addFields: {
              owner: { $arrayElemAt: ["$owner", 0] },
            },
          },
        ],
      },
    },
  ]);

  const newApiResponse = new ApiResponse(
    200,
    videos,
    "User liked videos fetched successfully."
  );

  if (!newApiResponse?.length) {
    newApiResponse.message = "User has not liked any videos.";
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, videos, "User liked videos fetched successfully.")
    );
});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
