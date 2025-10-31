import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscription.models.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId.trim() || !isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id.");
  }

  const subscription = await Subscription.findOne({
    channel: channelId,
    subscriber: req.user._id,
  });

  if (!subscription) {
    throw new ApiError(400, "Channel not subscribed.");
  }

  const deletedSubscription = await Subscription.findOneAndDelete({
    channel: channelId,
    subscriber: req.user._id,
  });

  if (!deletedSubscription) {
    throw new ApiError(500, "Error while unsubscribing given channel.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Channel unsubscribed successfully."));
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!channelId.trim() || !isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id.");
  }

  const channel = await User.findById(channelId);

  if (!channel) {
    throw new ApiError(400, "Channel not found.");
  }

  const subscribers = await Subscription.find({ channel: channelId }).populate(
    "subscriber",
    "username avatar coverImage"
  );

  const apiResponse = new ApiResponse(
    200,
    subscribers,
    "User channel subscribers fetched successfully."
  );

  if (!apiResponse.data) {
    apiResponse.message = "Channel has no subscribers.";
  }

  return res.status(200).json(apiResponse);
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  if (!subscriberId.trim() || !isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid channel id.");
  }

  const user = await User.findById(subscriberId);

  if (!user) {
    throw new ApiError(400, "User not found.");
  }

  const subscribedChannels = await Subscription.find({
    subscriber: subscriberId,
  }).populate("channel", "username avatar coverImage");

  const apiResponse = new ApiResponse(
    200,
    subscribedChannels,
    "Subscribed channels fetched successfully."
  );

  if (!apiResponse.data) {
    apiResponse.message = "User has no subscribed channels.";
  }

  return res.status(200).json(apiResponse);
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
