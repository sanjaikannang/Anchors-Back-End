import express from "express";
import session from "express-session";
import MongoDBStoreLib from "connect-mongodb-session";
import dotenv from "dotenv";

import connectDB from "./connectMongoDB.js";
import userRoutes from "./routes/userRoutes.js";
import companyRoutes from "./routes/companyRoutes.js"
import studentRoutes from "./routes/studentRoutes.js"

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
connectDB();

// Create Express app
const app = express();

// Create a new MongoDBStore instance
const MongoDBStore = MongoDBStoreLib(session);

// Initialize session store
const store = new MongoDBStore({
    uri: process.env.CONNECTION_URL,
    collection: "sessions"
});

// Catch errors
store.on("error", function(error) {
    console.error("Session store error:", error);
});

// Session middleware setup
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        store: store
    })
);

// Middleware for parsing JSON bodies
app.use(express.json());

// Routes setup
app.use('/user', userRoutes);
app.use('/company', companyRoutes);
app.use('/student', studentRoutes);

// app.use('/',(req, res) => {
//     res.send("This is an Job Ssearch Application Project !!!")
// })

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
