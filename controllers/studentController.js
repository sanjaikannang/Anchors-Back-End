import nodemailer from "nodemailer";
import dotenv from 'dotenv';
import Company from "../models/companyModel.js";
import User from "../models/userModel.js";

dotenv.config();

export const applyJob = async (req, res) => {
    try {
        // Ensure the user has the "student" role
        if (req.user.role !== "student") {
            return res.status(403).json({ message: "Forbidden: Only students can apply for jobs" });
        }

        const jobId = req.params.jobId;

        // Check if the student has already applied for this job
        const alreadyApplied = await User.exists({ _id: req.userId, "appliedJobs.jobId": jobId });
        if (alreadyApplied) {
            return res.status(400).json({ message: "You have already applied for this job" });
        }

        // Find the job in the database
        const company = await Company.findOne({ "jobs._id": jobId });

        if (!company) {
            return res.status(404).json({ message: "Job not found" });
        }

        // Find the user associated with the company
        const user = await User.findById(company.userId);

        if (!user) {
            return res.status(404).json({ message: "User not found for the company" });
        }

        // Extract the email from the user object
        const companyEmail = user.email;

        // Find the student who is applying
        const student = await User.findById(req.userId);

        // Find the job details
        const jobDetails = company.jobs.find(job => job._id.toString() === jobId);

        // Calculate the required amount (sum of character lengths)
        const requiredAmount = jobDetails.roleName.length + jobDetails.minCTC.toString().length + jobDetails.maxCTC.toString().length + jobDetails.jobLocation.length;
        if (student.balance < requiredAmount) {
            return res.status(400).json({ message: "Insufficient balance" });
        }

        // Transfer half of the amount to the company's account
        company.balance += requiredAmount;
        await company.save();

        // Reduce the student's balance
        student.balance -= requiredAmount;
        await student.save();

        // Mark the job as applied by the student
        company.jobs.forEach(job => {
            if (job._id.toString() === jobId) {
                job.appliedBy = req.userId;
            }
        });

        // Save the updated company document
        await company.save();

        // Update student's appliedJobs array
        await User.findByIdAndUpdate(req.userId, {
            $push: { appliedJobs: { jobId } }
        });

        // Send email notification to the company
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        const mailOptions = {
            from: 'Your Name <' + process.env.EMAIL_USERNAME + '>',
            to: companyEmail, // Use the company's email address from the user object
            subject: "Job Application Notification",
            html: `<p style="font-family: Arial, sans-serif; font-size: 16px;">Hello,</p>
                   <p style="font-family: Arial, sans-serif; font-size: 16px;">A student has applied for the job <strong>${jobDetails.roleName}</strong>.</p>
                   <p style="font-family: Arial, sans-serif; font-size: 16px;">Student Details:</p>
                   <ul>
                       <li>Name: ${student.name}</li>
                       <li>Email: ${student.email}</li>
                       <li>Phone: ${student.phone}</li>
                   </ul>
                   <p style="font-family: Arial, sans-serif; font-size: 16px;">Regards,</p>
                   <p style="font-family: Arial, sans-serif; font-size: 16px;">Anchors Job Portal Team,</p>`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                // console.error("Error sending email:", error);
                res.status(500).json({ message: "Error sending email" });
            } else {
                // console.log("Email sent:", info.response);
                // Respond with job and company details
                res.status(200).json({ message: "Job applied successfully", jobDetails, company });
            }
        });
    } catch (error) {
        console.error("Error applying for job:", error);
        res.status(500).json({ message: "Server error" });
    }
};
