import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    addVideoToPlaylist,
    getPlaylistsByUser,
} from "../store/Slices/playlistSlice";

// Watch page ka "Save" button: apni playlists dikhao, click par video add
function SaveToPlaylist({ videoId }) {
    const [open, setOpen] = useState(false);
    const dispatch = useDispatch();
    const userId = useSelector((state) => state.auth?.userData?._id);
    const playlists = useSelector((state) => state.playlist?.playlists);

    const toggleOpen = () => {
        // Har dafa khulne par apni playlists taaza mangwao
        if (!open && userId) dispatch(getPlaylistsByUser(userId));
        setOpen((prev) => !prev);
    };

    const save = async (playlistId) => {
        await dispatch(addVideoToPlaylist({ videoId, playlistId }));
        setOpen(false);
    };

    return (
        <div className="relative">
            <button
                type="button"
                onClick={toggleOpen}
                className="rounded-full bg-[#222222] px-4 py-1 text-sm hover:bg-[#333333]"
            >
                Save
            </button>
            {open && (
                <div className="absolute z-20 mt-2 w-56 border border-slate-600 bg-black p-2 text-sm">
                    <p className="mb-2 font-semibold">Save to playlist</p>
                    {playlists?.length === 0 && (
                        <p className="text-xs text-slate-400">
                            No playlists yet. Create one from your channel&apos;s
                            Playlists tab.
                        </p>
                    )}
                    {playlists?.map((playlist) => (
                        <button
                            type="button"
                            key={playlist._id}
                            onClick={() => save(playlist._id)}
                            className="block w-full truncate px-2 py-1 text-left hover:bg-[#222222]"
                        >
                            {playlist.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SaveToPlaylist;
