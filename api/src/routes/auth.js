import { Router } from 'express'
import bcrypt from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'
import db from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Register
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    // Check if email exists
    const existingUser = db.data.users.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = {
      id: uuidv4(),
      firstName,
      lastName,
      email: email.toLowerCase(),
      passwordHash,
      settings: {
        allowMultipleTasks: true
      },
      createdAt: new Date().toISOString()
    }

    db.data.users.push(user)
    await db.write()

    // Create session
    const session = {
      id: uuidv4(),
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    }
    db.data.sessions.push(session)
    await db.write()

    res.cookie('sessionId', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    })

    const { passwordHash: _, ...userWithoutPassword } = user
    res.status(201).json({ user: userWithoutPassword })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    const user = db.data.users.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash)
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Create session
    const session = {
      id: uuidv4(),
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
    db.data.sessions.push(session)
    await db.write()

    res.cookie('sessionId', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    })

    const { passwordHash: _, ...userWithoutPassword } = user
    res.json({ user: userWithoutPassword })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

// Logout
router.post('/logout', requireAuth, async (req, res) => {
  try {
    db.data.sessions = db.data.sessions.filter(s => s.id !== req.sessionId)
    await db.write()

    res.clearCookie('sessionId')
    res.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Logout failed' })
  }
})

// Get current user
router.get('/me', requireAuth, (req, res) => {
  const { passwordHash: _, ...userWithoutPassword } = req.user
  res.json({ user: userWithoutPassword })
})

// Update user settings
router.put('/settings', requireAuth, async (req, res) => {
  try {
    const { settings } = req.body
    const user = db.data.users.find(u => u.id === req.user.id)

    if (user) {
      user.settings = { ...user.settings, ...settings }
      await db.write()
    }

    const { passwordHash: _, ...userWithoutPassword } = user
    res.json({ user: userWithoutPassword })
  } catch (error) {
    console.error('Settings update error:', error)
    res.status(500).json({ error: 'Failed to update settings' })
  }
})

// Generate API token
router.post('/tokens', requireAuth, async (req, res) => {
  try {
    const { name } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Token name is required' })
    }

    // Generate a random token
    const plainToken = uuidv4() + '-' + uuidv4()
    const tokenHash = await bcrypt.hash(plainToken, 10)

    const apiToken = {
      id: uuidv4(),
      userId: req.user.id,
      name,
      tokenHash,
      createdAt: new Date().toISOString(),
      lastUsedAt: null
    }

    db.data.apiTokens.push(apiToken)
    await db.write()

    // Return the plain token only once
    res.status(201).json({
      token: {
        id: apiToken.id,
        name: apiToken.name,
        createdAt: apiToken.createdAt,
        plainToken // Only returned on creation
      }
    })
  } catch (error) {
    console.error('Token creation error:', error)
    res.status(500).json({ error: 'Failed to create token' })
  }
})

// List API tokens
router.get('/tokens', requireAuth, (req, res) => {
  const tokens = db.data.apiTokens
    .filter(t => t.userId === req.user.id)
    .map(({ tokenHash, ...t }) => t)

  res.json({ tokens })
})

// Revoke API token
router.delete('/tokens/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const token = db.data.apiTokens.find(t => t.id === id && t.userId === req.user.id)

    if (!token) {
      return res.status(404).json({ error: 'Token not found' })
    }

    db.data.apiTokens = db.data.apiTokens.filter(t => t.id !== id)
    await db.write()

    res.json({ success: true })
  } catch (error) {
    console.error('Token revoke error:', error)
    res.status(500).json({ error: 'Failed to revoke token' })
  }
})

export default router
