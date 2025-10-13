import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Like } from "../models/like.models.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId.trim() || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id");
  }

  const like = await Like.findOne({
    video: videoId,
    user: req.user._id,
  });

  if (!like) {
    throw new ApiError(404, "Like not found");
  }

  const deletedLike = await Like.findOneAndDelete({
    video: videoId,
    user: req.user._id,
  });

  if (!deletedLike) {
    throw new ApiError(500, "Error while deleting like");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deletedLike, "Like deleted successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!commentId.trim() || !isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment id");
  }

  const like = await Like.findOne({
    comment: commentId,
    user: req.user._id,
  });

  if (!like) {
    throw new ApiError(404, "Like not found");
  }

  const deletedLike = await Like.findOneAndDelete({
    comment: commentId,
    user: req.user._id,
  });

  if (!deletedLike) {
    throw new ApiError(500, "Error while deleting like");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deletedLike, "Like deleted successfully"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!tweetId.trim() || !isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id");
  }

  const like = await Like.findOne({
    tweet: tweetId,
    user: req.user._id,
  });

  if (!like) {
    throw new ApiError(404, "Like not found");
  }

  const deletedLike = await Like.findOneAndDelete({
    tweet: tweetId,
    user: req.user._id,
  });

  if (!deletedLike) {
    throw new ApiError(500, "Error while deleting like");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deletedLike, "Like deleted successfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
