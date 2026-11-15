import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getUserChannelSubscribers } from "../../store/Slices/subscriptionSlice";
import { Avatar } from "../../components";
import { Link } from "react-router-dom";

function ChannelSubscribers() {
    const dispatch = useDispatch();
    const channelId = useSelector((state) => state.user.profileData?._id);
    const subscribers = useSelector(
        (state) => state.subscription.channelSubscribers
    );
    const loading = useSelector((state) => state.subscription?.loading);

    useEffect(() => {
        if (channelId) {
            dispatch(getUserChannelSubscribers(channelId));
        }
    }, [dispatch, channelId]);

    if (!loading && subscribers?.length === 0) {
        return <p className="text-white text-center p-5">No subscribers yet</p>;
    }

    return (
        <>
            {subscribers?.map((subscriber) => (
                // Subscriber par click -> uska channel
                <Link
                    key={subscriber?.subscriber?._id}
                    to={`/channel/${subscriber?.subscriber?.username}`}
                    className="flex border-b border-slate-500 px-3 py-1 justify-between items-center text-white"
                >
                    <div className="flex gap-3 items-center">
                        <Avatar
                            src={subscriber?.subscriber?.avatar?.url}
                            channelName={subscriber?.subscriber?.username}
                        />
                        <div>
                            <h5 className="text-sm">
                                {subscriber?.subscriber?.username}
                            </h5>
                            <span className="text-xs text-slate-400">
                                {subscriber?.subscriber?.subscribersCount}{" "}
                                Subscribers
                            </span>
                        </div>
                    </div>
                    {/* Pehle yahan ek button tha jo kuch nahi karta tha, ab sirf status dikhate hain */}
                    {subscriber?.subscriber?.subscribedToSubscriber && (
                        <span className="text-xs text-slate-400">
                            Subscribed back
                        </span>
                    )}
                </Link>
            ))}
        </>
    );
}

export default ChannelSubscribers;
