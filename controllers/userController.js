import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../models/userModel.js";

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

// Register user and send OTP to email
export const register = async (req, res) => {
    try {
        const { name, email, role } = req.body;

        // Check if user already exists with the given email
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User with this email already exists" });
        }

        // Generate OTP
        const otp = generateOTP();

        // Send OTP to user's email
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL_USERNAME,
            to: email,
            subject: "Registration OTP",
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h1 style="color: #333;">Welcome to Anchors Job Portal !</h1>
                <p style="font-size: 16px;">Hello ${name},</p>
                <p style="font-size: 16px;">Thank you for registering with Anchors Job Portal.</p>
                <p style="font-size: 16px;">Your OTP for registration is: <strong>${otp}</strong></p>
                <p style="font-size: 16px;">Please use this OTP to complete your registration process.</p>
                <p style="font-size: 16px;">Best regards,</p>
                <p style="font-size: 16px;">Anchors Job Portal Team !</p>
              </div>
            `,
        };

        await transporter.sendMail(mailOptions);

        // Save user data and OTP in session for verification
        req.session.registerData = { name, email, role, otp };

        res.status(200).json({ message: "OTP has been sent to your email. Kindly check your email inbox!", otp });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Verify OTP and register user
export const verifyOTP = async (req, res) => {
    try {
        // Retrieve registration data from session
        const registerData = req.session.registerData;

        // Check if registration data exists in session
        if (!registerData) {
            return res.status(400).json({ message: "Registration data not found in session" });
        }

        // Destructure registration data
        const { name, email, role, otp: storedOTP } = registerData;

        // Check if any required properties are missing
        if (!name || !email || !role || !storedOTP) {
            return res.status(400).json({ message: "Incomplete registration data in session" });
        }

        // Convert both OTP values to the same data type (string or number) before comparison
        const receivedOTP = req.body.otp.toString(); // Convert to string
        const storedOTPString = storedOTP.toString(); // Convert stored OTP to string

        // Check if OTP matches
        if (receivedOTP !== storedOTPString) {
            return res.status(400).json({ message: "Incorrect OTP" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(req.body.password, 10);

        // Save user to database
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            role,
        });
        await newUser.save();

        // Send registration success email
        const bonusPoints = role === "student" ? 300 : 200;
        const bonusMessage = `
          Congratulations! You have received <span style="color: #ff6600; font-weight: bold;">${bonusPoints} bonus points</span>.
          ${role === "student" ? "You can use these bonus points provided by Anchors to apply for jobs on our platform." : "You can use these bonus points provided by Anchors to post your job listings on our platform."}
        `;
        
        const registrationSuccessMessage = `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="color: #333;">Welcome to Anchors Job Portal!</h1>
            <p style="font-size: 16px;">Hello ${name},</p>
            <p style="font-size: 16px;">You have successfully registered.</p>
            <p style="font-size: 16px;">${bonusMessage}</p>
            <p style="font-size: 16px;">Best regards,</p>
            <p style="font-size: 16px;">Anchors Job Portal Team</p>
          </div>
        `;

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD,
            },
        });
        const registrationSuccessMailOptions = {
            from: process.env.EMAIL_USERNAME,
            to: email,
            subject: "Registration Successful",
            html: registrationSuccessMessage,
        };
        await transporter.sendMail(registrationSuccessMailOptions);

        // Update bonus points in user document
        newUser.balance += bonusPoints;
        await newUser.save();

        // Clear registerData from session after successful registration
        delete req.session.registerData;

        // Construct response object with user details
        const responseData = {
            message: "User registered successfully",
            name,
            email,
            role,
            balance: newUser.balance,
        };

        res.status(201).json(responseData);
    } catch (error) {
        console.error("Error verifying OTP and registering user:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Login user
export const loginUser = async (req, res) => {
  try {
      const { email, password } = req.body;

      // Find the user by email
      const user = await User.findOne({ email });

      // If user is not found, return error
      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      // Verify password
      const isPasswordMatch = await bcrypt.compare(password, user.password);

      // If password is incorrect, return error
      if (!isPasswordMatch) {
          return res.status(401).json({ message: 'Invalid credentials' });
      }

      // If authentication is successful, generate JWT token
      const tokenPayload = {
          id: user._id,
          role: user.role, // Set the role based on the user's role in the database
      };

      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '10h' });

      // Return the token in the response
      res.status(200).json({ token });
  } catch (error) {
      console.error('Error logging in user:', error);
      res.status(500).json({ message: 'Server error' });
  }
};
