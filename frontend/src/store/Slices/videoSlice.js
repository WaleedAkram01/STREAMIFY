import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../helpers/axiosInstance";
import toast from "react-hot-toast";

const initialState = {
    loading: false,
    uploading: false,
    uploaded: false,
    videos: {
        docs: [],
        hasNextPage: false,
        nextCursor: null,
        totalDocs: null,
    },
    video: null,
    publishToggled: false,
};

// Backend sortBy support nahi karta (cursor pagination _id par hai), isliye sort yahan karte hain
const durationToSeconds = (duration) => {
    if (typeof duration === "number") return duration;
    return String(duration || "0")
        .split(":")
        .reduce((total, part) => total * 60 + (Number(part) || 0), 0);
};

const sortVideos = (videos, sortBy, sortType) => {
    if (!sortBy) return videos;
    const direction = sortType === "asc" ? 1 : -1;
    const value = (video) => {
        if (sortBy === "duration") return durationToSeconds(video.duration);
        if (sortBy === "createdAt") return new Date(video.createdAt).getTime();
        return Number(video[sortBy]) || 0;
    };
    return [...videos].sort((a, b) => (value(a) - value(b)) * direction);
};

// page 1 = shuru se, page > 1 = pichle response ka nextCursor (backend `nextId` leta hai)
export const getAllVideos = createAsyncThunk(
    "getAllVideos",
    async ({ userId, sortBy, sortType, query, page, limit }, { getState }) => {
        try {
            const params = {};
            if (userId) params.userId = userId;
            if (query) params.query = query;
            // sort client side hota hai, isliye sorted lists ke liye zyada videos mangwao
            params.limit = sortBy ? 50 : limit || 10;

            if (page && page > 1) {
                const nextCursor = getState().video?.videos?.nextCursor;
                if (nextCursor) params.nextId = nextCursor;
            }

            const response = await axiosInstance.get("/videos/get-all", {
                params,
            });
            const { videos = [], pageInfo = {} } = response.data.data || {};

            return {
                docs: sortVideos(videos, sortBy, sortType),
                hasNextPage: Boolean(pageInfo.hasNextPage),
                nextCursor: pageInfo.nextCursor || null,
            };
        } catch (error) {
            toast.error(error?.response?.data?.error);
            throw error;
        }
    }
);

export const publishAvideo = createAsyncThunk("publishAvideo", async (data) => {
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("description", data.description);
    // Backend multer field ka naam "video" hai
    formData.append("video", data.videoFile[0]);
    if (data.thumbnail?.[0]) formData.append("thumbnail", data.thumbnail[0]);

    try {
        const response = await axiosInstance.post(
            "/videos/publish-video",
            formData
        );
        toast.success(response?.data?.message);
        return response.data.data;
    } catch (error) {
        toast.error(error?.response?.data?.error);
        throw error;
    }
});

export const updateAVideo = createAsyncThunk(
    "updateAVideo",
    async ({ videoId, data }) => {
        const formData = new FormData();
        if (data.title) formData.append("title", data.title);
        if (data.description) formData.append("description", data.description);
        if (data.thumbnail?.[0]) formData.append("thumbnail", data.thumbnail[0]);

        try {
            const response = await axiosInstance.patch(
                `/videos/update-video/${videoId}`,
                formData
            );
            toast.success(response?.data?.message);
            return response.data.data;
        } catch (error) {
            toast.error(error?.response?.data?.error);
            throw error;
        }
    }
);

export const deleteAVideo = createAsyncThunk(
    "deleteAVideo",
    async (videoId) => {
        try {
            const response = await axiosInstance.delete(
                `/videos/delete-video/${videoId}`
            );
            toast.success(response?.data?.message);
            return response.data.data;
        } catch (error) {
            toast.error(error?.response?.data?.error);
            throw error;
        }
    }
);

export const getVideoById = createAsyncThunk(
    "getVideoById",
    async ({ videoId }) => {
        try {
            const response = await axiosInstance.get(
                `/videos/get-video/${videoId}`
            );
            return response.data.data;
        } catch (error) {
            toast.error(error?.response?.data?.error);
            throw error;
        }
    }
);

export const togglePublishStatus = createAsyncThunk(
    "togglePublishStatus",
    async (videoId) => {
        try {
            const response = await axiosInstance.patch(
                `/videos/toggle-publish/${videoId}`
            );
            toast.success(response.data.message);
            return response.data.data.isPublished;
        } catch (error) {
            toast.error(error?.response?.data?.error);
            throw error;
        }
    }
);

const videoSlice = createSlice({
    name: "video",
    initialState,
    reducers: {
        updateUploadState: (state) => {
            state.uploading = false;
            state.uploaded = false;
        },
        makeVideosNull: (state) => {
            state.videos.docs = [];
            state.videos.hasNextPage = false;
            state.videos.nextCursor = null;
            state.videos.totalDocs = null;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(getAllVideos.pending, (state) => {
            state.loading = true;
        });
        builder.addCase(getAllVideos.rejected, (state) => {
            state.loading = false;
        });
        builder.addCase(getAllVideos.fulfilled, (state, action) => {
            state.loading = false;
            state.videos.docs = [...state.videos.docs, ...action.payload.docs];
            state.videos.hasNextPage = action.payload.hasNextPage;
            state.videos.nextCursor = action.payload.nextCursor;
            state.videos.totalDocs = state.videos.docs.length;
        });
        builder.addCase(publishAvideo.pending, (state) => {
            state.uploading = true;
        });
        builder.addCase(publishAvideo.fulfilled, (state) => {
            state.uploading = false;
            state.uploaded = true;
        });
        builder.addCase(publishAvideo.rejected, (state) => {
            state.uploading = false;
        });
        builder.addCase(updateAVideo.rejected, (state) => {
            state.uploading = false;
        });
        builder.addCase(updateAVideo.pending, (state) => {
            state.uploading = true;
        });
        builder.addCase(updateAVideo.fulfilled, (state) => {
            state.uploading = false;
            state.uploaded = true;
        });
        builder.addCase(deleteAVideo.pending, (state) => {
            state.loading = true;
        });
        builder.addCase(deleteAVideo.fulfilled, (state) => {
            state.loading = false;
        });
        builder.addCase(getVideoById.pending, (state) => {
            state.loading = true;
        });
        builder.addCase(getVideoById.fulfilled, (state, action) => {
            state.loading = false;
            state.video = action.payload;
        });
        builder.addCase(togglePublishStatus.fulfilled, (state) => {
            state.publishToggled = !state.publishToggled;
        });
    },
});

export const { updateUploadState, makeVideosNull } = videoSlice.actions;

export default videoSlice.reducer;
