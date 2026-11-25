import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
    createAPlaylist,
    getPlaylistsByUser,
} from "../../store/Slices/playlistSlice";
import { Button, Input } from "../../components";
import PlaylistCover from "../../components/PlaylistCover";
import axiosInstance from "../../helpers/axiosInstance";
import { useForm } from "react-hook-form";
import { IoCloseCircleOutline } from "../../components/icons";
import { timeAgo } from "../../helpers/timeAgo";
import { Link } from "react-router-dom";

function ChannelPlaylist() {
    const dispatch = useDispatch();
    const playlists = useSelector((state) => state.playlist?.playlists);
    const authId = useSelector((state) => state.auth.userData?._id);
    const userId = useSelector((state) => state.user.profileData?._id);
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();
    const [openCreatePlaylist, setOpenCreatePlaylist] = useState(false);
    // playlistId -> thumbnail urls (jab backend "thumbnails" na bheje to yahan fetch karte hain)
    const [covers, setCovers] = useState({});

    useEffect(() => {
        if (userId) {
            dispatch(getPlaylistsByUser(userId));
        }
    }, [dispatch, userId]);

    useEffect(() => {
        const missing = (playlists || []).filter(
            (p) => !p.thumbnails && p.totalVideos > 0 && !covers[p._id],
        );
        if (!missing.length) return;
        let cancelled = false;
        Promise.all(
            missing.map((p) =>
                axiosInstance
                    .get(`/playlists/${p._id}`)
                    .then((res) => [
                        p._id,
                        (res.data?.data?.videos || [])
                            .map((v) => v.thumbnail?.url)
                            .filter(Boolean)
                            .slice(0, 4),
                    ])
                    .catch(() => [p._id, []]),
            ),
        ).then((entries) => {
            if (!cancelled)
                setCovers((prev) => ({
                    ...prev,
                    ...Object.fromEntries(entries),
                }));
        });
        return () => {
            cancelled = true;
        };
    }, [playlists]); // eslint-disable-line react-hooks/exhaustive-deps

    const createPlaylist = (data) => {
        dispatch(createAPlaylist(data));
        setOpenCreatePlaylist((prev) => !prev);
    };

    return (
        <>
            <div className="w-full relative text-white sm:px-5 px-0">
                {playlists?.length == 0 && (
                    <div className="text-center h-[5rem] flex justify-center items-center">
                        <h1>No Playlist Found</h1>
                    </div>
                )}
                {authId === userId && (
                    <div className="w-full flex justify-center mt-5">
                        <Button
                            className="bg-purple-500 text-sm p-2"
                            onClick={() =>
                                setOpenCreatePlaylist((prev) => !prev)
                            }
                        >
                            Create Playlist
                        </Button>
                    </div>
                )}
                {openCreatePlaylist && (
                    <div className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-black bg-transparent z-40">
                        <div className="relative w-full max-w-sm border bg-black">
                            <form
                                onSubmit={handleSubmit(createPlaylist)}
                                className="w-full space-y-5 p-4"
                            >
                                <h2 className="text-2xl font-bold">
                                    Create Playlist
                                </h2>
                                <IoCloseCircleOutline
                                    size={30}
                                    className="absolute -top-2 right-4 cursor-pointer"
                                    onClick={() =>
                                        setOpenCreatePlaylist((prev) => !prev)
                                    }
                                />
                                <Input
                                    label="Name: "
                                    placeholder="Enter playlist name"
                                    {...register("name", {
                                        required: "name is required",
                                    })}
                                />
                                {errors.name && (
                                    <span className="text-red-500 text-sm">
                                        {errors.name.message}
                                    </span>
                                )}

                                <Input
                                    label="Description: "
                                    placeholder="Enter description for your playlist"
                                    {...register("description", {
                                        required: "description is required",
                                    })}
                                />
                                {errors.description && (
                                    <span className="text-red-500 text-sm">
                                        {errors.description.message}
                                    </span>
                                )}
                                <Button
                                    className="bg-purple-500 text-sm p-2 w-full"
                                    type="submit"
                                >
                                    Create Playlist
                                </Button>
                            </form>
                        </div>
                    </div>
                )}
                <div className="grid xl:grid-cols-3 md:grid-cols-2 p-2 gap-5 grid-cols-1 w-full mt-5">
                    {playlists?.map((playlist) => (
                        <Link
                            to={`/playlist/${playlist._id}`}
                            key={playlist._id}
                            className="group block w-full pt-2"
                        >
                            <PlaylistCover
                                thumbnails={
                                    playlist.thumbnails ||
                                    covers[playlist._id] ||
                                    []
                                }
                                totalVideos={playlist.totalVideos}
                                className="group-hover:opacity-90 transition-opacity"
                            />
                            <div className="py-2 px-1">
                                <p className="font-semibold group-hover:text-purple-300">
                                    {playlist.name}
                                </p>
                                <p className="text-xs text-slate-400 line-clamp-1">
                                    {playlist.description}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {playlist.totalViews} views ·{" "}
                                    {timeAgo(playlist.updatedAt)}
                                </p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </>
    );
}

export default ChannelPlaylist;
