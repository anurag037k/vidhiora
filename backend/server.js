const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Root check route (Prevents "Cannot GET /" message)
app.get('/', (req, res) => {
  res.send('Vidhiora API Server is Live and Active!');
});

// In-Memory Database
let newsArticles = [
  { id: 1, title: "Supreme Court Clarifies Basic Structure Doctrine", category: "Constitutional Law", summary: "A bench re-evaluates procedural thresholds for amendments." },
  { id: 2, title: "Digital Personal Data Protection Rules Implemented", category: "Cyber Law", summary: "Updated compliance frameworks for tech platforms." }
];

let studyNotes = [
  { id: 1, subject: "Constitutional Law", title: "Fundamental Rights & Writs Summary", uploadedBy: "Prof. Sharma" },
  { id: 2, subject: "Criminal Law", title: "IPC General Exceptions Overview", uploadedBy: "Dr. Verma" }
];

let careerPosts = [
  { id: 1, title: "Law Clerkship - High Court", stipend: "₹35,000/mo", type: "Clerkship" },
  { id: 2, title: "Corporate Legal Internship", stipend: "₹20,000/mo", type: "Internship" }
];

let leaderboard = {};

// REST API Endpoints
app.get('/api/news', (req, res) => res.json(newsArticles));
app.get('/api/notes', (req, res) => res.json(studyNotes));
app.get('/api/career', (req, res) => res.json(careerPosts));

// Socket.io Real-Time Quiz Engine
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('faculty_start_quiz', (questionData) => {
    io.emit('student_receive_question', questionData);
  });

  socket.on('student_submit_answer', (data) => {
    const { studentName, points } = data;
    if (!leaderboard[studentName]) leaderboard[studentName] = 0;
    leaderboard[studentName] += points;

    const sorted = Object.entries(leaderboard)
      .map(([name, score]) => ({ name, score }))
      .sort((a, b) => b.score - a.score);

    io.emit('update_leaderboard', sorted);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Vidhiora Backend listening on port ${PORT}`);
});