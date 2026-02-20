import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import recipeRoutes from './routes/recipes.js';
import analyticsRoutes from './routes/analytics.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(cors({
  origin: ALLOWED_ORIGINS,
  methods: ['GET', 'POST'],
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api', recipeRoutes);
app.use('/api/analytics', analyticsRoutes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'Chickpea API',
    version: '1.0.0',
    endpoints: {
      'POST /api/recipes': 'Search and scrape recipes from top cooking websites',
      'GET /api/health': 'Health check',
      'GET /api/scraper-status': 'Scraper health & diagnostics',
      'POST /api/analytics/events': 'Ingest analytics events (batched)',
      'GET /api/analytics/ingredients': 'Ingredient frequency data',
      'GET /api/analytics/dashboard': 'Aggregate analytics dashboard',
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🫘 Chickpea API Server running on http://localhost:${PORT}`);
  console.log(`   POST /api/recipes           — Search for recipes`);
  console.log(`   GET  /api/health            — Health check`);
  console.log(`   GET  /api/scraper-status    — Scraper diagnostics`);
  console.log(`   POST /api/analytics/events  — Ingest analytics events`);
  console.log(`   GET  /api/analytics/ingredients — Ingredient stats`);
  console.log(`   GET  /api/analytics/dashboard   — Dashboard\n`);
});
