import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
    deletePlaylist,
    getPlaylistById,
    removeVideoFromPlaylist,
} from "../store/Slices/playlistSlice";
import { Button, Container, VideoList } from "../components";

function PlaylistDetail() {
    const { playlistId } = useParams();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const playlist = useSelector((state) => state.playlist?.playlist);
    const loading = useSelector((state) => state.playlist?.loading);
    const authUsername = useSelector((state) => state.auth?.userData?.username);
    const isOwner = playlist?.owner?.username === authUsername;

    useEffect(() => {
        dispatch(getPlaylistById(playlistId));
    }, [dispatch, playlistId]);

    const handleDelete = async () => {
        if (!window.confirm("Delete this playlist?")) return;
        const result = await dispatch(deletePlaylist(playlistId));
        if (!result.error) navigate(`/channel/${authUsername}/playlists`);
    };

    if (loading) {
        return <div className="text-white p-5">Loading playlist...</div>;
    }

    if (!playlist) {
        return <div className="text-white p-5">Playlist not found</div>;
    }

    return (
        <Container>
            <div className="text-white p-3 sm:p-5 space-y-2 border-b border-slate-600">
                <div className="flex justify-between items-start gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">{playlist.name}</h1>
                        <p className="text-sm text-slate-400">
                            {playlist.description}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                            {playlist.totalVideos} Videos · by @
                            {playlist.owner?.username}
                        </p>
                    </div>
                    {isOwner && (
                        <Button
                            className="bg-red-500 text-sm px-3 py-1"
                            onClick={handleDelete}
                        >
                            Delete Playlist
                        </Button>
                    )}
                </div>
            </div>

            {playlist.videos?.length === 0 && (
                <p className="text-white text-center p-5">
                    No videos in this playlist yet
                </p>
            )}

            <div className="grid xl:grid-cols-3 sm:grid-cols-2 grid-cols-1 text-white">
                {playlist.videos?.map((video) => (
                    <div key={video._id}>
                        <VideoList
                            thumbnail={video.thumbnail?.url}
                            duration={video.duration}
                            title={video.title}
                            views={video.views}
                            createdAt={video.createdAt}
                            videoId={video._id}
                        />
                        {isOwner && (
                            <button
                                type="button"
                                className="text-xs text-red-400 hover:text-red-300 px-3 pb-3"
                                onClick={() =>
                                    dispatch(
                                        removeVideoFromPlaylist({
                                            videoId: video._id,
                                            playlistId,
                                        })
                                    )
                                }
                            >
                                Remove from playlist
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </Container>
    );
}

export default PlaylistDetail;
