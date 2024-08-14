import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
const userName = process.env.DB_USER;
const password = encodeURIComponent(process.env.DB_PASS);

const dbName = process.env.DB_Name;
const dbURL = `mongodb+srv://${userName}:${password}@cluster0.ke3mn7e.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=Cluster0`;
const connectDB = async () => {
  try {
    await mongoose.connect(dbURL);
    console.log(`Database connected successfully`);
  } catch (error) {
    console.log(error.message);
    console.log(`Database Connection error`);
  }
};

export default connectDB;
