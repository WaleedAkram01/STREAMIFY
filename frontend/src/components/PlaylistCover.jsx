import React from "react";
import { MdPlaylistPlay } from "react-icons/md";

// Playlist cover: first video's thumbnail with a "stacked" look and a video count badge.
// Empty playlists get a gradient placeholder instead of a blank box.
function PlaylistCover({ thumbnails = [], totalVideos = 0, className = "" }) {
    const cover = thumbnails[0];

    return (
        <div className={`relative w-full aspect-video ${className}`}>
            {cover && (
                <>
                    {/* stacked cards behind the cover */}
                    <div className="absolute -top-2 left-4 right-4 h-4 rounded-t-lg bg-slate-600/60" />
                    <div className="absolute -top-1 left-2 right-2 h-4 rounded-t-lg bg-slate-500/70" />
                </>
            )}
            <div className="relative w-full h-full overflow-hidden rounded-lg bg-slate-900">
                {cover ? (
                    <img
                        src={cover}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-700/60 via-slate-900 to-blue-800/50">
                        <MdPlaylistPlay className="text-white/70" size={56} />
                    </div>
                )}
                <div className="absolute right-0 top-0 bottom-0 w-2/5 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-1 text-white">
                    <span className="text-xl font-semibold">{totalVideos}</span>
                    <MdPlaylistPlay size={26} />
                    <span className="text-xs text-slate-300">videos</span>
                </div>
            </div>
        </div>
    );
}

export default PlaylistCover;
