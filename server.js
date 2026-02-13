const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const crushRoutes = require("./routes/crushRoutes");
const matchRoutes = require("./routes/matchRoutes");

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Store io instance for use in controllers
app.set("io", io);

// Socket.IO connection handling
const userSockets = new Map(); // Map userId to socketId

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // User joins with their userId
  socket.on("join", (userId) => {
    if (userId) {
      userSockets.set(userId, socket.id);
      socket.userId = userId;
      console.log(`User ${userId} joined with socket ${socket.id}`);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    if (socket.userId) {
      userSockets.delete(socket.userId);
      console.log(`User ${socket.userId} disconnected`);
    }
  });
});

// Store userSockets map for use in controllers
app.set("userSockets", userSockets);

// Trust proxy - required for Render and other reverse proxy deployments
app.set("trust proxy", 1);

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// CORS - allow all origins
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { message: "Too many requests, please try again later." },
});
app.use("/api/", limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (for uploaded images before Cloudinary upload)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/crush", crushRoutes);
app.use("/api/users", (req, res, next) => {
  // Redirect /api/users to crushRoutes handler
  req.url = "/users";
  crushRoutes(req, res, next);
});
app.use("/api/matches", matchRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);

  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ message: "File too large. Maximum size is 5MB." });
    }
    return res.status(400).json({ message: err.message });
  }

  if (err.message) {
    return res.status(400).json({ message: err.message });
  }

  res.status(500).json({ message: "Something went wrong!" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
