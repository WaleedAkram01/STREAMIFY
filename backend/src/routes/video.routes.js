import { Router } from "express";
import {
  PublishAVideo,
  getAllVideos,
  updateVideo,
  getVideoById,
  togglePublishStatus,
  deleteVideo,
} from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
// Bilkul sahi naam jo aapne abhi dikhaya:
import { uploadVideoFields, upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Public: home aur search page logged-out visitors ko bhi videos dikhate hain
router.get("/get-all", getAllVideos);

// Baaki sab routes ke liye login zaroori
router.use(verifyJWT);

router.post(
  "/publish-video",
  uploadVideoFields.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  PublishAVideo,
);

router.get("/get-video/:videoId", getVideoById);

router.patch("/update-video/:videoId", upload.single("thumbnail"), updateVideo);

router.patch("/toggle-publish/:videoId", togglePublishStatus);

router.delete("/delete-video/:videoId", deleteVideo);

export default router;
