import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Like } from "../models/like.models.js";

const toggleVideoLike = asyncHandler( async(req, res) => {
    const { videoId } = req.params;
    
}) 

const toggleCommentLike = asyncHandler( async(req, res) => {
    const { commentId } = req.params;

}) 

const toggleTweetLike = asyncHandler( async(req, res) => {
    const { tweetId } = req.params;

}) 

const getLikedVideos = asyncHandler( async(req, res) => {

}) 

export {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos
}
