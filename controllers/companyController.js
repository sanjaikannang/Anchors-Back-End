import mongoose from "mongoose";
import nodemailer from 'nodemailer';

import Company from "../models/companyModel.js";

// Register a new company
export const registerCompany = async (req, res) => {
  try {
    // Ensure that the user's role is "company"
    if (req.user.role !== "company") {
      return res.status(401).json({ message: "Unauthorized: Only companies can register a company" });
    }

    const { companyName, location, employees } = req.body;
    const existingCompany = await Company.findOne({ companyName });
    if (existingCompany) {
      return res.status(400).json({ message: "Company with this name already exists" });
    }

    // Add the user ID to the company document
    const newCompany = new Company({
      companyName,
      location,
      employees,
      userId: req.user.id, // Assign the user ID to the company document
    });

    await newCompany.save();

    // Return the registered company details in the response, including the company ID
    res.status(201).json({ message: "Company registered successfully", company: newCompany });
  } catch (error) {
    console.error("Error registering company:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Post a job
export const postJob = async (req, res) => {
  try {
    // Check if the logged-in user's role is "company"
    if (req.user.role !== 'company') {
      return res.status(401).json({ message: 'Unauthorized: Only companies can post jobs' });
    }

    const { roleName, minCTC, maxCTC, jobLocation } = req.body;

    // Find the company using the user ID associated with the token
    const company = await Company.findOne({ userId: req.user.id });

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Check if there is enough balance to post the job
    if (company.balance < 50) {
      return res.status(400).json({ message: 'No available balance to post job' });
    }

    // Generate a unique job ID
    const jobId = new mongoose.Types.ObjectId();

    // Calculate the amount required to apply for the job
    const requiredAmount = roleName.length + minCTC.toString().length + maxCTC.toString().length + jobLocation.length;

    // Reduce company balance by 50
    company.balance -= 50;

    // Create a new job object
    const newJob = {
      _id: jobId, // Include the job ID
      roleName,
      minCTC,
      maxCTC,
      jobLocation,
      requiredAmount, // Include the required amount in the job object
    };

    // Push the new job object to the company's jobs array
    company.jobs.push(newJob);

    // Save the updated company details
    await company.save();

    // Fetch the company details again to include in the response
    const updatedCompany = await Company.findById(company._id);

    // Send email to all students with job details
    const transporter = nodemailer.createTransport({
      // Specify your email service and authentication details
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

// Compose email message with styling
const mailOptions = {
  from: 'your-email@gmail.com',
  to: 'students-email@example.com', // Specify the recipient's email address
  subject: 'New Job Opening!',
  html: `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4; border-radius: 10px;">
      <h2 style="margin-bottom: 20px;">Hello Students,</h2>
      <p style="margin-bottom: 10px;">A new job has been posted:</p>
      <ul style="list-style-type: none; padding-left: 0;">
        <li style="margin-bottom: 10px;">
          <strong>Role:</strong> ${roleName}
        </li>
        <li style="margin-bottom: 10px;">
          <strong>Min CTC:</strong> ${minCTC}
        </li>
        <li style="margin-bottom: 10px;">
          <strong>Max CTC:</strong> ${maxCTC}
        </li>
        <li style="margin-bottom: 10px;">
          <strong>Location:</strong> ${jobLocation}
        </li>
      </ul>
      <p style="margin-top: 20px;">Apply for this job now!</p>
      <div style="background-color: #fff; border-radius: 5px; padding: 10px; margin-top: 20px;">
        <h3 style="color: #007bff; margin-bottom: 10px;">Company Details:</h3>
        <ul style="list-style-type: none; padding-left: 0;">
          <li style="margin-bottom: 5px;"><strong>Company Name:</strong> ${updatedCompany.companyName}</li>
          <li style="margin-bottom: 5px;"><strong>Location:</strong> ${updatedCompany.location}</li>
          <li style="margin-bottom: 5px;"><strong>Employees Count:</strong> ${updatedCompany.employees}</li>
        </ul>
      </div>
    </div>
  `,
};

    // Send email
    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: 'Job posted successfully', jobId: jobId, job: newJob, company: updatedCompany });
  } catch (error) {
    console.error('Error posting job:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get company details by ID
export const getCompanyDetails = async (req, res) => {
  try {
    const companyId = req.params.companyId;

    // Find the company by ID
    const company = await Company.findById(companyId).populate({
      path: 'jobs.appliedBy', // Populate the 'appliedBy' field in the 'jobs' array
      model: 'User', // Assuming User is the model name for the user schema
      select: 'name email', // Select only the name and email fields of the user
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Return company details
    res.status(200).json({ company });
  } catch (error) {
    console.error("Error retrieving company details:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET job details by job ID
export const getJobDetails = async (req, res) => {
  try {
    const jobId = req.params.jobId;

    // Find the company that has the job with the provided job ID
    const company = await Company.findOne({ 'jobs._id': jobId }).populate('jobs.appliedBy');

    // Find the job within the company's jobs array based on the job ID
    const job = company.jobs.find(job => job._id.toString() === jobId);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Calculate the required amount
    const requiredAmount = job.roleName.length + job.minCTC.toString().length + job.maxCTC.toString().length + job.jobLocation.length;

    // Include the requiredAmount in the job object
    job.requiredAmount = requiredAmount;

    res.status(200).json({ message: 'Job details retrieved successfully', job, requiredAmount });
  } catch (error) {
    console.error('Error retrieving job details:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// Get all job details along with corresponding company details
export const getAllJobDetails = async (req, res) => {
  try {
    // Fetch all jobs from the database along with corresponding company details
    const jobs = await Company.aggregate([
      { $unwind: "$jobs" }, // Unwind the jobs array
      {
        $project: {
          _id: "$jobs._id",
          roleName: "$jobs.roleName",
          minCTC: "$jobs.minCTC",
          maxCTC: "$jobs.maxCTC",
          jobLocation: "$jobs.jobLocation",
          companyId: "$_id", // Include companyId for reference
          companyName: "$companyName", // Include companyName
          location: "$location", // Include company location
          employees: "$employees" // Include number of employees
        }
      }
    ]);

    res.status(200).json({ jobs });
  } catch (error) {
    console.error('Error retrieving all job details:', error);
    res.status(500).json({ message: 'Server error' });
  }
};