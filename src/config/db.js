const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb+srv://asavita3012:Abhi3012shek@cluster0.d5v6i0v.mongodb.net/team-task-manager?appName=Cluster0';
    await mongoose.connect(uri);
    console.log('MongoDB connected');
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
