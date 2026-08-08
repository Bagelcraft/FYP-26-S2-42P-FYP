const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const orgAdminRoutes = require('./routes/org-admin.routes');
const pmRoutes = require('./routes/pm.routes');
const permanentWorkerRoutes = require('./routes/permanent-worker.routes');
const temporaryWorkerRoutes = require('./routes/temporary-worker.routes');
const publicRoutes = require('./routes/public.routes');
const errorMiddleware = require('./middleware/error.middleware');
const contentRoutes = require("./routes/content.routes");


const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'frame-src': ["'self'", 'https://www.youtube.com', 'https://www.youtube-nocookie.com'],
      'img-src':   ["'self'", 'data:', 'https:'],
    },
  },
}));
// Allow the configured client URL, any Vercel deployment (prod + previews), and localhost.
const allowedOrigins = (process.env.CLIENT_URL || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);                       // curl / same-origin / server-to-server
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (/\.vercel\.app$/.test(origin)) return cb(null, true); // Vercel production + preview URLs
    if (/^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
}));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin/content', contentRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/org-admin', orgAdminRoutes);
app.use('/api/v1/pm', pmRoutes);
app.use('/api/v1/worker', permanentWorkerRoutes);
app.use('/api/v1/temp-worker', temporaryWorkerRoutes);
app.use('/api/v1/public', publicRoutes);

app.use(errorMiddleware);

module.exports = app;