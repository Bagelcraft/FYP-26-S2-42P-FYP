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

app.use(helmet());
//Orignial 
// app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
//Testing database connection - can remove below after 
app.use(cors({ origin: process.env.CLIENT_URL || /^http:\/\/localhost:\d+$/ }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/org-admin', orgAdminRoutes);
app.use('/api/v1/pm', pmRoutes);
app.use('/api/v1/worker', permanentWorkerRoutes);
app.use('/api/v1/temp-worker', temporaryWorkerRoutes);
app.use('/api/v1/public', publicRoutes);
app.use("/api/v1/admin/content", contentRoutes);

app.use(errorMiddleware);

module.exports = app;
