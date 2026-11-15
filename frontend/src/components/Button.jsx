import React from "react";

function Button({
    children,
    type = "button",
    bgColor = "blue",
    textColor = "text-white",
    className = "",
    ...props
}) {
    return (
        // type asli attribute hona chahiye: warna form ke andar har Button (Cancel/Reset bhi) submit kar deta tha
        <button
            type={type}
            className={`${className} ${bgColor} ${textColor} hover:scale-110 duration-100 ease-in`}
            {...props}
        >
            {children}
        </button>
    );
}

export default Button;
