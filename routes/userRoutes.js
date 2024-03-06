import express from "express";
import { register, verifyOTP, loginUser } from "../controllers/userController.js";

const router = express.Router();

// Register route
router.post("/register", register);

// Verify OTP route
router.post("/verify-otp", verifyOTP);

// Login route
router.post("/login", loginUser);

export default router;
