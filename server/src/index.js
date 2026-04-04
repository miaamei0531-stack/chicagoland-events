require('dotenv').config();
const express = require('express');
const cors = require('cors');
const scheduler = require('./ingestion/scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/v1', require('./routes/health'));
app.use('/api/v1/events', require('./routes/events'));
app.use('/api/v1/submissions', require('./routes/submissions'));
app.use('/api/v1', require('./routes/comments')); // handles /events/:id/comments and /comments/:id
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/admin', require('./routes/admin'));
app.use('/api/v1/ingest', require('./routes/ingest'));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  scheduler.start();
});
