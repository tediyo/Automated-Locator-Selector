
const mongoose = require('mongoose');
require('dotenv').config();

//const uri = "mongodb+srv://tewodros16:Tedi12%26%24@cluster0.v6p4dst.mongodb.net/?appName=Clust
const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/twt";

console.log('Attempting to connect to MongoDB...');
console.log('URI:', uri.replace(/:([^@]+)@/, ':****@')); // Mask password

mongoose.connect(uri, {
  serverSelectionTimeoutMS: 5000,
})
.then(() => {
  console.log('Successfully connected to MongoDB!');
  process.exit(0);
})
.catch(err => {
  console.error('Connection error details:', err);
  process.exit(1);
});
