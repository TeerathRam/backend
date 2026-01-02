import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.models.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!videoId.trim() || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id.");
  }

  if (isNaN(page) || isNaN(limit)) {
    throw new ApiError(400, "Page and limit must be numbers.");
  }

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  const comments = await Comment.find({
    video: videoId,
  })
    .populate("owner", "username avatar")
    .sort({ createdAt: -1 })
    .skip((options.page - 1) * options.limit)
    .limit(options.limit);

  const newApiResponse = new ApiResponse(
    200,
    comments,
    "Comments fetched successfully."
  );

  if (!comments.length) {
    newApiResponse.message = "Video has no comments.";
  }

  return res.status(200).json(newApiResponse);
});

const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Content is required.");
  }

  const { videoId } = req.params;
  if (!videoId.trim() || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video id.");
  }

  const comment = await Comment.create({
    content,
    owner: req.user._id,
    vidoe: videoId,
  });

  if (!comment) {
    throw new ApiError(500, "Error while creating comment.");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment created successfully."));
});

const updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Content is required.");
  }

  const { commentId } = req.params;
  if (!commentId.trim() || !isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid tweet id or tweet id is required.");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found.");
  }

  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this comment.");
  }

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content: content,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedComment) {
    throw new ApiError(500, "Error while updating the comment.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedComment, "Comment updated successfully.")
    );
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!commentId.trim() || !isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid tweet id or tweet id is required.");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found.");
  }

  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this comment.");
  }

  await Comment.findByIdAndDelete(commentId);
  await Like.deleteMany({ comment: commentId });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted successfully."));
});

export { getVideoComments, addComment, updateComment, deleteComment };
