import React, { useEffect } from "react";
import { ChannelHeader, ChannelNavigate, Spinner } from "../components";
import { useDispatch, useSelector } from "react-redux";
import { Outlet } from "react-router-dom";
import { userChannelProfile } from "../store/Slices/userSlice.js";

function EditChannel() {
    const dispatch = useDispatch();
    const channel = useSelector((state) => state.auth?.userData);
    const loading = useSelector((state) => state.auth?.loading);
    // Subscribers / Subscribed counts current-user data mein nahi hote, channel profile se lo
    const profile = useSelector((state) => state.user?.profileData);
    const counts = profile?._id === channel?._id ? profile : null;

    useEffect(() => {
        if (channel?.username) dispatch(userChannelProfile(channel.username));
    }, [dispatch, channel?.username]);

    window.scrollTo(0, 0);
    return (
        <>
            {loading && (
                <div className="w-full fixed top-20 flex justify-center z-20">
                    <div className="w-52 border border-slate-600 bg-black flex gap-2 p-3">
                        <Spinner />
                        <span className="text-md font-bold text-white">
                            Please wait...
                        </span>
                    </div>
                </div>
            )}

            {channel && (
                <ChannelHeader
                    username={channel?.username}
                    coverImage={channel?.coverImage?.url}
                    avatar={channel?.avatar?.url}
                    subscribedCount={counts?.channelsSubscribedToCount}
                    fullName={channel?.fullName}
                    subscribersCount={counts?.subscribersCount}
                    isSubscribed={channel?.isSubscribed}
                    channelId={channel?._id}
                    edit={true}
                />
            )}
            <ChannelNavigate edit={true} />
            <div className="overflow-y-scroll h-[32rem] sm:h-96 mb-20 sm:mb-0">
                <Outlet />
            </div>
        </>
    );
}

export default EditChannel;
