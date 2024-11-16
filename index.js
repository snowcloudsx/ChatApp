const express = require("express");
const { createServer } = require("node:http");
const { join } = require("node:path");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const app = express();
const server = createServer(app);
const io = new Server(server);

// MongoDB connection
const mongoURI = "mongodb+srv://SnowDev:Seamusd0g@cluster0.cbif8.mongodb.net/"; // Replace with your MongoDB connection string
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.log(err));

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model("User ", userSchema); // Fixed extra space in model name

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(join(__dirname, 'public'))); // Serve static files

app.get("/", (req, res) => {
    res.sendFile(join(__dirname, "index.html"));
});

// User registration
app.post("/signup", async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser  = new User({ username, password: hashedPassword });

    try {
        await newUser .save();
        res.status(201).json({ message: "User  created" });
    } catch (error) {
        res.status(400).json({ error: "User  already exists" });
    }
});

// User login
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ id: user._id, username: user.username }, "your_jwt_secret", { expiresIn: "1h" });
        res.cookie("token", token, { httpOnly: true });
        res.status(200).json({ message: "Login successful", username: user.username });
    } else {
        res.status(401).json({ error: "Invalid username or password" });
    }
});

// Middleware to check authentication
const authenticateJWT = (req, res, next) => {
    const token = req.cookies.token;
    if (token) {
        jwt.verify(token, "your_jwt_secret", (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(403);
    }
};

// Socket.io authentication
io.use((socket, next) => {
    const token = socket.handshake.headers.cookie?.split('=')[1];
    if (token) {
        jwt.verify(token, "your_jwt_secret", (err, user) => {
            if (err) {
                return next(new Error('Authentication error'));
            }
            socket.user = user; // Store user info on socket
            next();
        });
    } else {
        next(new Error('Authentication error'));
    }
});

// Socket.io connection
io.on('connection', (socket) => {
    console.log(`User  with ID: ${socket.user.id} has connected`);

    socket.on("chat message", (msg) => {
        // Ensure msg is an object with username and message
        const message = typeof msg === 'object' && msg.username && msg.message ? msg : { username: 'Unknown', message: '' };
        console.log(`Message: ${message.message} was sent by user ${message.username}`);
        io.emit("chat message", message); // Emit the message object
    });

    socket.on('disconnect', () => {
        console.log(`User  with ID: ${socket.user.id} has disconnected`);
    });
});

// Start the server
server.listen(3000, () => {
    console.log("Server Running at http://localhost:3000");
});
