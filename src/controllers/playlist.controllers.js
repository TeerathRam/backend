import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asynchandler.js";

const creatPlaylist = asyncHandler( async(req, res) => {
    const { name, description } = req.body;
    console.log("BODY", req.body)
    if (!name && !description) {
        throw new ApiError(400, "Name and description is required");
    }

    const playlist = await Playlist.create(
        {
            name,
            description,
            owner: req.user._id
        }
    );

    if (!playlist) {
        throw new ApiError(500, "Error while creating playlist");
    }

    return res
    .status(201)
    .json(
        new ApiResponse(201, playlist, "Playlist created successfully")
    )
});

const getUserPlaylists = asyncHandler( async(req, res) => {
    const { userId } = req.params;
    if (!userId.tri() || !isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id");
    }
});

const getPlaylistById = asyncHandler( async(req, res) => {
    const { playlistId } = req.params;
    if (!playlistId.tri() || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, playlist, "Playlist fetched successfully")
    );

});

const addVideoToPlaylist = asyncHandler( async(req, res) => {
    const { playlistId, videoId } = req.params;
    if (!playlistId.tri() || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }

    if (!videoId.tri() || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }
});

const removeVideoFromPlaylist = asyncHandler( async(req, res) => {
    const { playlistId, videoId } = req.params;
    if (!playlistId.tri() || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }

    if (!videoId.tri() || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }
});

const deletePlaylist = asyncHandler( async(req, res) => {
    const { playlistId } = req.params;
    if (!playlistId.tri() || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);
    if (!deletedPlaylist) {
        throw new ApiError(500, "Error while deleting the playlist");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, "Playlist deleted successfully")
    )
});

const updatePlaylist = asyncHandler( async(req, res) => {
    const { name, description } = req.body;
    if (!name || !description) {
        throw new ApiError(400, "Name or description is required");
    }

    const { playlistId } = req.params;
    if (!playlistId.tri() || !isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist id");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId,
        {
            $set: {
                name,
                description
            }
        },
        {
            new: true
        }
    );

    if (!updatedPlaylist) {
        throw new ApiError(500, "Error while updating playlist");
    }
    
    return res
    .status(200)
    .json(200, updatedPlaylist, "Playlist updated successfully");
});


export {
    creatPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}