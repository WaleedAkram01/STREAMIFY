import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../helpers/axiosInstance";
import toast from "react-hot-toast";

const initialState = {
    loading: false,
    playlist: [],
    playlists: [],
};

export const createAPlaylist = createAsyncThunk(
    "createPlaylist",
    async ({ name, description }) => {
        try {
            const response = await axiosInstance.post("/playlists", {
                name,
                description,
            });
            if (response.data?.success) {
                toast.success(response.data.message);
            }
            return response.data.data;
        } catch (error) {
            toast.error(error?.response?.data?.error);
            throw error;
        }
    }
);

export const addVideoToPlaylist = createAsyncThunk(
    "addVideoToPlaylist",
    async ({ videoId, playlistId }) => {
        try {
            const response = await axiosInstance.patch(
                `/playlists/add/${videoId}/${playlistId}`
            );
            if (response.data?.success) {
                toast.success(response.data.message);
            }
            return response.data?.data;
        } catch (error) {
            toast.error(error?.response?.data?.error);
            throw error;
        }
    }
);

export const removeVideoFromPlaylist = createAsyncThunk(
    "removeVideoFromPlaylist",
    async ({ videoId, playlistId }) => {
        try {
            const response = await axiosInstance.patch(
                `/playlists/remove/${videoId}/${playlistId}`
            );
            if (response.data?.success) {
                toast.success(response.data.message);
            }
            return response.data.data;
        } catch (error) {
            toast.error(error?.response?.data?.error);
            throw error;
        }
    }
);

export const getPlaylistById = createAsyncThunk(
    "getPlaylistById",
    async (playlistId) => {
        try {
            const response = await axiosInstance.get(`/playlists/${playlistId}`);
            return response.data.data;
        } catch (error) {
            toast.error(error?.response?.data?.error);
            throw error;
        }
    }
);

export const getPlaylistsByUser = createAsyncThunk(
    "getPlaylistsByUser",
    async (userId) => {
        try {
            const response = await axiosInstance.get(
                `/playlists/user/${userId}`
            );
            return response.data.data;
        } catch (error) {
            toast.error(error?.response?.data?.error);
            throw error;
        }
    }
);

export const upadtePlaylist = createAsyncThunk(
    "upadtePlaylist",
    async ({ playlistId, name, description }) => {
        try {
            const response = await axiosInstance.patch(
                `/playlists/${playlistId}`,
                { name, description }
            );
            if (response.data.success) {
                toast.success(response.data.message);
            }
            return response.data.data;
        } catch (error) {
            toast.error(error?.response?.data?.error);
            throw error;
        }
    }
);

export const deletePlaylist = createAsyncThunk(
    "deletePlaylist",
    async (playlistId) => {
        try {
            const response = await axiosInstance.delete(
                `/playlists/${playlistId}`
            );
            toast.success(response.data?.message);
            return playlistId;
        } catch (error) {
            toast.error(error?.response?.data?.error);
            throw error;
        }
    }
);

const playlistSlice = createSlice({
    name: "playlist",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(getPlaylistsByUser.fulfilled, (state, action) => {
            state.playlists = action.payload;
        });
        // Nayi playlist foran list mein dikhe
        builder.addCase(createAPlaylist.fulfilled, (state, action) => {
            state.playlists.unshift({
                ...action.payload,
                totalVideos: 0,
                totalViews: 0,
            });
        });
        builder.addCase(getPlaylistById.pending, (state) => {
            state.loading = true;
            state.playlist = null;
        });
        builder.addCase(getPlaylistById.fulfilled, (state, action) => {
            state.loading = false;
            state.playlist = action.payload;
        });
        builder.addCase(getPlaylistById.rejected, (state) => {
            state.loading = false;
        });
        // Playlist page se video hatao (dobara fetch ki zaroorat nahi)
        builder.addCase(removeVideoFromPlaylist.fulfilled, (state, action) => {
            const { videoId } = action.meta.arg;
            if (state.playlist?.videos) {
                state.playlist.videos = state.playlist.videos.filter(
                    (video) => video._id !== videoId
                );
                state.playlist.totalVideos = state.playlist.videos.length;
            }
        });
        builder.addCase(deletePlaylist.fulfilled, (state, action) => {
            state.playlists = state.playlists.filter(
                (playlist) => playlist._id !== action.payload
            );
        });
    },
});

export default playlistSlice.reducer;
