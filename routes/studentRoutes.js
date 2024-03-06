import express from "express";
import { applyJob } from "../controllers/studentController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Apply for the job using the job id
router.post("/apply-job/:jobId", auth, applyJob);

export default router;
