import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db/index.js'
import { requireTokenAuth } from '../middleware/auth.js'

const router = Router()

// Start task via shortcut
router.post('/start/:taskId', requireTokenAuth, async (req, res) => {
  try {
    const { taskId } = req.params

    const task = db.data.tasks.find(t => t.id === taskId && t.userId === req.user.id)
    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    // Check if task is already running
    const existingEntry = db.data.entries.find(
      e => e.userId === req.user.id && e.taskId === taskId && e.endTime === null
    )
    if (existingEntry) {
      return res.json({
        message: 'Task already running',
        entry: existingEntry,
        task
      })
    }

    const entry = {
      id: uuidv4(),
      userId: req.user.id,
      taskId,
      startTime: new Date().toISOString(),
      endTime: null,
      comment: null,
      createdAt: new Date().toISOString()
    }

    db.data.entries.push(entry)
    await db.write()

    res.status(201).json({
      message: `Started: ${task.name}`,
      entry,
      task
    })
  } catch (error) {
    console.error('Shortcut start error:', error)
    res.status(500).json({ error: 'Failed to start task' })
  }
})

// Stop task via shortcut
router.post('/stop/:taskId', requireTokenAuth, async (req, res) => {
  try {
    const { taskId } = req.params

    const task = db.data.tasks.find(t => t.id === taskId && t.userId === req.user.id)
    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    const entry = db.data.entries.find(
      e => e.taskId === taskId && e.userId === req.user.id && e.endTime === null
    )

    if (!entry) {
      return res.json({
        message: 'Task not running',
        task
      })
    }

    entry.endTime = new Date().toISOString()
    await db.write()

    const duration = Math.round((new Date(entry.endTime) - new Date(entry.startTime)) / 60000)

    res.json({
      message: `Stopped: ${task.name} (${duration} min)`,
      entry,
      task,
      duration
    })
  } catch (error) {
    console.error('Shortcut stop error:', error)
    res.status(500).json({ error: 'Failed to stop task' })
  }
})

// Toggle task (start if stopped, stop if running)
router.post('/toggle/:taskId', requireTokenAuth, async (req, res) => {
  try {
    const { taskId } = req.params

    const task = db.data.tasks.find(t => t.id === taskId && t.userId === req.user.id)
    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    const existingEntry = db.data.entries.find(
      e => e.userId === req.user.id && e.taskId === taskId && e.endTime === null
    )

    if (existingEntry) {
      // Stop the task
      existingEntry.endTime = new Date().toISOString()
      await db.write()

      const duration = Math.round((new Date(existingEntry.endTime) - new Date(existingEntry.startTime)) / 60000)

      return res.json({
        action: 'stopped',
        message: `Stopped: ${task.name} (${duration} min)`,
        entry: existingEntry,
        task,
        duration
      })
    } else {
      // Start the task
      const entry = {
        id: uuidv4(),
        userId: req.user.id,
        taskId,
        startTime: new Date().toISOString(),
        endTime: null,
        comment: null,
        createdAt: new Date().toISOString()
      }

      db.data.entries.push(entry)
      await db.write()

      return res.status(201).json({
        action: 'started',
        message: `Started: ${task.name}`,
        entry,
        task
      })
    }
  } catch (error) {
    console.error('Shortcut toggle error:', error)
    res.status(500).json({ error: 'Failed to toggle task' })
  }
})

// List tasks (for building shortcuts)
router.get('/tasks', requireTokenAuth, (req, res) => {
  const tasks = db.data.tasks.filter(t => t.userId === req.user.id && t.active)
  res.json({ tasks })
})

export default router
