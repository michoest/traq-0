import db from '../db/index.js'
import bcrypt from 'bcrypt'

// Session-based authentication middleware
export function requireAuth(req, res, next) {
  const sessionId = req.cookies?.sessionId

  if (!sessionId) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const session = db.data.sessions.find(s => s.id === sessionId)

  if (!session || new Date(session.expiresAt) < new Date()) {
    // Clean up expired session
    if (session) {
      db.data.sessions = db.data.sessions.filter(s => s.id !== sessionId)
      db.write()
    }
    return res.status(401).json({ error: 'Session expired' })
  }

  const user = db.data.users.find(u => u.id === session.userId)

  if (!user) {
    return res.status(401).json({ error: 'User not found' })
  }

  req.user = user
  req.sessionId = sessionId
  next()
}

// API token authentication middleware (for iOS Shortcuts)
export async function requireTokenAuth(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'API token required' })
  }

  const token = authHeader.substring(7)

  // Find matching token by comparing hashes
  let matchedToken = null
  for (const apiToken of db.data.apiTokens) {
    const match = await bcrypt.compare(token, apiToken.tokenHash)
    if (match) {
      matchedToken = apiToken
      break
    }
  }

  if (!matchedToken) {
    return res.status(401).json({ error: 'Invalid API token' })
  }

  const user = db.data.users.find(u => u.id === matchedToken.userId)

  if (!user) {
    return res.status(401).json({ error: 'User not found' })
  }

  // Update last used timestamp
  matchedToken.lastUsedAt = new Date().toISOString()
  await db.write()

  req.user = user
  req.apiToken = matchedToken
  next()
}

// Combined auth - accepts either session or token
export async function requireAnyAuth(req, res, next) {
  const authHeader = req.headers.authorization

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return requireTokenAuth(req, res, next)
  }

  return requireAuth(req, res, next)
}
