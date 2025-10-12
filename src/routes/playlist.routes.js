import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    creatPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
    } from "../controllers/playlist.controllers.js";

const router = Router();
router.use(verifyJWT);

router.route("/").post(creatPlaylist);

router.route("/:playlistId")
    .get(getPlaylistById)
    .patch(updatePlaylist)
    .delete(deletePlaylist);

router.route("/add/:videoId/:playlistId").patch(addVideoToPlaylist);
router.route("/remove/:videoId/:playlistId").patch(removeVideoFromPlaylist);
router.route("/user/:userId").get(getUserPlaylists);

export default router;