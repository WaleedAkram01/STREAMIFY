import axios from "axios";
import { BASE_URL } from "../constants.js";

const axiosInstance = axios.create({
    baseURL: BASE_URL,
    withCredentials: true, // accessToken / refreshToken httpOnly cookies ke liye
});

// Backend error ka text `message` mein bhejta hai, frontend `error` padhta hai.
// Dono ko ek kar dete hain taake har toast mein sahi message dikhe.
const attachErrorMessage = (error) => {
    const data = error?.response?.data;
    if (data && typeof data === "object" && !data.error) {
        data.error = data.message || "Something went wrong";
    }
    return error;
};

// Access token expire ho jaye (401) to ek dafa refresh-token call kar ke request dobara bhejo
let refreshPromise = null;
const SKIP_REFRESH = ["/users/login", "/users/register", "/users/refresh-token"];

axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error?.config;
        const status = error?.response?.status;
        const url = original?.url?.toString() || "";

        if (
            status === 401 &&
            original &&
            !original._retry &&
            !SKIP_REFRESH.some((path) => url.includes(path))
        ) {
            original._retry = true;
            try {
                refreshPromise =
                    refreshPromise ||
                    axios.post(`${BASE_URL}/users/refresh-token`, {}, { withCredentials: true });
                await refreshPromise;
                return axiosInstance(original);
            } catch {
                // refresh bhi fail -> user logged out hai, original error aage bhejo
            } finally {
                refreshPromise = null;
            }
        }

        return Promise.reject(attachErrorMessage(error));
    }
);

export default axiosInstance;
