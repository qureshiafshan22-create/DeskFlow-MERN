const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const ticketRoutes = require('./routes/ticketRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/deskflow';

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Logger middleware for easy backend debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/tickets', ticketRoutes);

// Base route for connectivity test
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'DeskFlow Backend is healthy' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server!' });
});

// Database connection & Server start
mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 2000 })
  .then(() => {
    console.log('Successfully connected to MongoDB.');
    global.useInMemoryDb = false;
    app.listen(PORT, () => {
      console.log(`DeskFlow Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.warn(`⚠️ MongoDB connection failed: ${err.message}`);
    console.warn('⚠️ Falling back to IN-MEMORY Demo Database Mode for evaluation!');
    global.useInMemoryDb = true;
    app.listen(PORT, () => {
      console.log(`DeskFlow Server (DEMO IN-MEMORY MODE) is running on port ${PORT}`);
    });
  });
