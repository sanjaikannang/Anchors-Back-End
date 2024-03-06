import mongoose from "mongoose";
import User from "./userModel.js"

const { Schema } = mongoose;

const companySchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
  },

  location: {
    type: String,
    required: true,
  },

  employees: {
    type: Number,
    required: true,
  },

  balance: {
    type: Number,
    default: 200,
  },
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User', 
  },

  jobs: [
    {
      roleName: {
        type: String,
        required: true,
      },
      minCTC: {
        type: Number,
        required: true,
      },
      maxCTC: {
        type: Number,
        required: true,
      },
      jobLocation: {
        type: String,
        required: true,
      },
      appliedBy: { 
        type: Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
      },
    },
  ],

});

const Company = mongoose.model("Company", companySchema);

export default Company;
