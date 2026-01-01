import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.models.js";
import { Like } from "../models/like.models.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Content is required.");
  }

  const tweet = await Tweet.create({
    content,
    owner: req.user?._id,
  });

  if (!tweet) {
    throw new ApiError(500, "Error while creating tweet.");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, tweet, "Tweet created successfully."));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!userId.trim() || !isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user id or user id is required.");
  }

  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
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
              fullName: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "likes",
        foreignField: "tweet",
        localField: "_id",
        as: "likes",
      },
    },
    {
      $addFields: {
        likes: { $size: "$likes" },
      },
    },
  ]);

  let apiResponse = new ApiResponse(
    200,
    tweets,
    "Tweets fetched successfully."
  );

  if (!tweets.length) {
    apiResponse.message = "User has no tweets.";
  }

  return res.status(200).json(apiResponse);
});

const updateTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Contentis is required.");
  }

  const { tweetId } = req.params;
  if (!tweetId.trim() || !isValidObjectId(tweetId)) {
    throw new ApiError(
      401,
      "Tweet with given id not found or invalid tweet id."
    );
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet with given id not found.");
  }

  if (tweet.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this tweet.");
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
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

  if (!updatedTweet) {
    throw new ApiError(500, "Error while updating tweet.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully."));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!tweetId.trim() || !isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id or tweet id is required.");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this tweet.");
  }

  await Tweet.findByIdAndDelete(tweetId);
  await Like.deleteMany({ tweet: tweetId });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted successfully."));
});

const getTweetById = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  if (!tweetId.trim() || !isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet id or tweet id is required.");
  }

  const tweet = await Tweet.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(tweetId),
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
              fullName: 1,
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
        foreignField: "tweet",
        as: "likes",
      },
    },
    {
      $addFields: {
        owner: { $arrayElemAt: ["$owner", 0] },
        likes: { $size: "$likes" },
      },
    },
  ]);

  if (!tweet.length) {
    throw new ApiError(404, "Tweet with given id not found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweet[0], "Tweet fetched successfully."));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet, getTweetById };
