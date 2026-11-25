import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../helpers/axiosInstance";
import { formatDuration, timeAgo } from "../helpers/timeAgo";

// "Up next" list on the player page: latest published videos, minus the one playing.
// Uses its own request so it doesn't touch the home feed's redux state.
function UpNext({ currentVideoId }) {
    const navigate = useNavigate();
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        axiosInstance
            .get("/videos/get-all", { params: { limit: 13 } })
            .then((res) => {
                if (cancelled) return;
                const list = res.data?.data?.videos || [];
                setVideos(
                    list.filter((v) => v._id !== currentVideoId).slice(0, 12),
                );
            })
            .catch(() => !cancelled && setVideos([]))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [currentVideoId]);

    return (
        <aside className="w-full lg:w-[400px] lg:shrink-0 text-white px-2 sm:px-5 lg:px-0 lg:pr-4 lg:pt-4 pb-6">
            <h2 className="font-semibold text-lg mb-3">Up next</h2>

            {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-3 mb-3 animate-pulse">
                        <div className="w-40 h-24 shrink-0 rounded-lg bg-slate-800" />
                        <div className="flex-1 space-y-2 py-1">
                            <div className="h-3 bg-slate-800 rounded w-full" />
                            <div className="h-3 bg-slate-800 rounded w-2/3" />
                            <div className="h-3 bg-slate-800 rounded w-1/3" />
                        </div>
                    </div>
                ))}

            {!loading && videos.length === 0 && (
                <p className="text-sm text-slate-400">No other videos yet.</p>
            )}

            {!loading &&
                videos.map((video) => (
                    <button
                        type="button"
                        key={video._id}
                        onClick={() => navigate(`/watch/${video._id}`)}
                        className="group flex gap-3 w-full text-left mb-3 rounded-lg p-1 hover:bg-white/5 transition-colors"
                    >
                        <div className="relative w-40 h-24 shrink-0 overflow-hidden rounded-lg bg-slate-900">
                            <img
                                src={video.thumbnail?.url}
                                alt={video.title}
                                loading="lazy"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 text-xs">
                                {formatDuration(video.duration)}
                            </span>
                        </div>
                        <div className="min-w-0 py-0.5">
                            <h3 className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-purple-300">
                                {video.title}
                            </h3>
                            <p className="text-xs text-slate-300 mt-1 truncate">
                                {video.ownerDetails?.fullName ||
                                    video.ownerDetails?.username}
                            </p>
                            <p className="text-xs text-slate-400">
                                {video.views} views · {timeAgo(video.createdAt)}
                            </p>
                        </div>
                    </button>
                ))}
        </aside>
    );
}

export default UpNext;
