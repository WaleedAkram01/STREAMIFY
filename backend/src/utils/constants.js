export const DB_NAME = "streamify";

// Cookie options aik hi jagah: login, refresh aur logout teeno same options use karein
// (warna clearCookie browser mein cookie delete nahi karta)
const isProd = process.env.NODE_ENV === "production";
export const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
};

// Pagination limits
export const DEFAULT_PAGE_LIMIT = 10;
export const MAX_PAGE_LIMIT = 50;
