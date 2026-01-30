import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import authRoutes from './routes/auth.js'
import tasksRoutes from './routes/tasks.js'
import tagsRoutes from './routes/tags.js'
import entriesRoutes from './routes/entries.js'
import shortcutsRoutes from './routes/shortcuts.js'
import dispatchRoutes from './routes/dispatch.js'

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

// Routes
app.use('/auth', authRoutes)
app.use('/tasks', tasksRoutes)
app.use('/tags', tagsRoutes)
app.use('/entries', entriesRoutes)
app.use('/shortcuts', shortcutsRoutes)
app.use('/dispatch', dispatchRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Traq API running on port ${PORT}`)
})
