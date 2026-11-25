const ago = (value, unit) => {
    const n = Math.max(1, Math.round(value));
    return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
};

export function timeAgo(createdAt) {
    const now = new Date();
    const difference = Math.abs(now - new Date(createdAt));

    const seconds = difference / 1000;
    const minutes = seconds / 60;
    const hours = minutes / 60;
    const days = hours / 24;
    const weeks = days / 7;
    const years = weeks / 52;

    if (seconds < 60) {
        return ago(seconds, "second");
    } else if (minutes < 60) {
        return ago(minutes, "minute");
    } else if (hours < 24) {
        return ago(hours, "hour");
    } else if (days < 7) {
        return ago(days, "day");
    } else if (weeks < 52) {
        return ago(weeks, "week");
    } else {
        return ago(years, "year");
    }
}

export function formatDuration(seconds) {
    // Backend duration "MM:SS" string mein bhejta hai, woh as-is dikhao
    if (typeof seconds === "string" && seconds.includes(":")) return seconds;
    seconds = Number(seconds) || 0;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    return minutes + ':' + (remainingSeconds < 10 ? '0' : '') + remainingSeconds;
}
