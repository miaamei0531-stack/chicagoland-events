require('dotenv').config();
const express = require('express');
const cors = require('cors');
const scheduler = require('./ingestion/scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: (origin, cb) => {
    // Allow: no origin, localhost, any vercel.app subdomain
    if (
      !origin ||
      origin.includes('localhost') ||
      origin.endsWith('.vercel.app') ||
      origin === process.env.FRONTEND_URL
    ) {
      cb(null, true);
    } else {
      cb(new Error(`CORS: ${origin} not allowed`));
    }
  },
}));
app.use(express.json());

// Routes
app.use('/api/v1', require('./routes/health'));
app.use('/api/v1/events', require('./routes/events'));
app.use('/api/v1/submissions', require('./routes/submissions'));
app.use('/api/v1', require('./routes/comments')); // handles /events/:id/comments and /comments/:id
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/admin', require('./routes/admin'));
app.use('/api/v1', require('./routes/collections')); // /events/:id/save, /events/:id/saved, /me/collections
app.use('/api/v1/conversations', require('./routes/conversations'));
app.use('/api/v1/trips', require('./routes/trips'));
app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/ingest', require('./routes/ingest'));
app.use('/api/v1/weather', require('./routes/weather'));
app.use('/api/v1/recommendations', require('./routes/recommendations'));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  scheduler.start();
});
