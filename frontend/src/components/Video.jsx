import React, { useEffect, useRef } from "react";
import Hls from "hls.js";

// Backend Cloudinary HLS (.m3u8) URL bhi de sakta hai, jo Chrome/Firefox
// natively nahi chalate, isliye hls.js use hota hai. Normal mp4 seedha chalta hai.
function Video({ src, poster }) {
    const videoRef = useRef(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !src) return;

        const isHls = /\.m3u8($|\?)/i.test(src);
        if (isHls && Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(src);
            hls.attachMedia(video);
            return () => hls.destroy();
        }

        video.src = src;
    }, [src]);

    return (
        <>
            <video
                ref={videoRef}
                poster={poster}
                autoPlay
                controls
                playsInline
                className="sm:h-[68vh] sm:max-w-4xl h-64 w-full object-contain"
            ></video>
        </>
    );
}

export default Video;
