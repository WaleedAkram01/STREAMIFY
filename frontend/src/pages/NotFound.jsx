import React from "react";
import { Link } from "react-router-dom";

// Koi route match na ho to blank page ki jagah yeh dikhao
function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center text-white h-screen gap-3">
            <h1 className="text-5xl font-bold text-purple-500">404</h1>
            <p className="text-lg">This page does not exist.</p>
            <Link
                to="/"
                className="bg-purple-500 text-black font-bold px-4 py-2"
            >
                Go Home
            </Link>
        </div>
    );
}

export default NotFound;
