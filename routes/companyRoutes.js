import express from "express";
import { registerCompany, postJob, getCompanyDetails, getJobDetails, getAllJobDetails } from "../controllers/companyController.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Register a new company
router.post("/register", auth, registerCompany);

// Post a job
router.post("/post-job", auth, postJob);

// Get all Job details 
router.get("/all-jobs", getAllJobDetails);

// Get company details by ID
router.get("/:companyId", auth, getCompanyDetails);

// Get Job details by ID
router.get("/jobs/:jobId", getJobDetails);

export default router;
