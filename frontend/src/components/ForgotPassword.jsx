import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Logo, Button, Input } from "./index";
import axiosInstance from "../helpers/axiosInstance";

// Step 1: email -> OTP bhejo.  Step 2: OTP + naya password -> reset
function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [sending, setSending] = useState(false);
    const navigate = useNavigate();
    const {
        handleSubmit,
        register,
        getValues,
        formState: { errors },
    } = useForm();

    const sendOtp = async (data) => {
        setSending(true);
        try {
            const response = await axiosInstance.post("/users/forgot-password", {
                email: data.email,
            });
            toast.success(response.data?.message);
            setEmail(data.email);
        } catch (error) {
            toast.error(error?.response?.data?.error);
        } finally {
            setSending(false);
        }
    };

    const resetPassword = async (data) => {
        setSending(true);
        try {
            const response = await axiosInstance.post("/users/reset-password", {
                email,
                otp: data.otp,
                password: data.password,
                confirmPassword: data.confirmPassword,
            });
            toast.success(response.data?.message);
            navigate("/login");
        } catch (error) {
            toast.error(error?.response?.data?.error);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="w-full h-screen text-white p-3 flex justify-center items-start">
            <div className="flex flex-col space-y-5 justify-center items-center border border-slate-600 p-3 mt-20 sm:w-96 w-full">
                <Logo />
                <h2 className="text-lg font-bold">Reset your password</h2>

                {!email ? (
                    <form
                        onSubmit={handleSubmit(sendOtp)}
                        className="space-y-5 p-2 w-full"
                    >
                        <Input
                            label="Email: "
                            type="email"
                            placeholder="Enter your account email"
                            {...register("email", {
                                required: "email is required",
                            })}
                        />
                        {errors.email && (
                            <span className="text-red-500">
                                {errors.email.message}
                            </span>
                        )}
                        <Button
                            type="submit"
                            bgColor="bg-purple-500"
                            className="w-full py-2 hover:bg-purple-700 text-lg disabled:opacity-60"
                            disabled={sending}
                        >
                            {sending ? "Sending..." : "Send OTP"}
                        </Button>
                    </form>
                ) : (
                    <form
                        onSubmit={handleSubmit(resetPassword)}
                        className="space-y-5 p-2 w-full"
                    >
                        <p className="text-sm text-slate-400">
                            OTP sent to {email} (valid for 5 minutes)
                        </p>
                        <Input
                            label="OTP: "
                            placeholder="6 digit code"
                            inputMode="numeric"
                            {...register("otp", {
                                required: "OTP is required",
                                pattern: {
                                    value: /^\d{6}$/,
                                    message: "OTP must be 6 digits",
                                },
                            })}
                        />
                        {errors.otp && (
                            <span className="text-red-500">
                                {errors.otp.message}
                            </span>
                        )}
                        <Input
                            label="New Password: "
                            type="password"
                            placeholder="New password"
                            {...register("password", {
                                required: "password is required",
                                minLength: {
                                    value: 8,
                                    message:
                                        "Password must be at least 8 characters long",
                                },
                            })}
                        />
                        {errors.password && (
                            <span className="text-red-500">
                                {errors.password.message}
                            </span>
                        )}
                        <Input
                            label="Confirm Password: "
                            type="password"
                            placeholder="Confirm new password"
                            {...register("confirmPassword", {
                                required: "please confirm your password",
                                validate: (value) =>
                                    value === getValues("password") ||
                                    "Passwords do not match",
                            })}
                        />
                        {errors.confirmPassword && (
                            <span className="text-red-500">
                                {errors.confirmPassword.message}
                            </span>
                        )}
                        <Button
                            type="submit"
                            bgColor="bg-purple-500"
                            className="w-full py-2 hover:bg-purple-700 text-lg disabled:opacity-60"
                            disabled={sending}
                        >
                            {sending ? "Please wait..." : "Reset Password"}
                        </Button>
                        <button
                            type="button"
                            className="text-sm text-purple-500 hover:opacity-70 w-full"
                            onClick={() => setEmail("")}
                        >
                            Use a different email / resend OTP
                        </button>
                    </form>
                )}

                <Link
                    to="/login"
                    className="text-sm text-purple-600 hover:opacity-70"
                >
                    Back to Login
                </Link>
            </div>
        </div>
    );
}

export default ForgotPassword;
