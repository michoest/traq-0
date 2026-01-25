import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Get entries with optional date filter
router.get('/', requireAuth, (req, res) => {
  const { startDate, endDate, taskId } = req.query

  let entries = db.data.entries.filter(e => e.userId === req.user.id)

  if (startDate) {
    entries = entries.filter(e => new Date(e.startTime) >= new Date(startDate))
  }

  if (endDate) {
    entries = entries.filter(e => new Date(e.startTime) <= new Date(endDate))
  }

  if (taskId) {
    entries = entries.filter(e => e.taskId === taskId)
  }

  // Sort by start time descending
  entries.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))

  res.json({ entries })
})

// Get active entries (currently running)
router.get('/active', requireAuth, (req, res) => {
  const entries = db.data.entries.filter(
    e => e.userId === req.user.id && e.endTime === null
  )
  res.json({ entries })
})

// Start task (create entry with null endTime)
router.post('/start', requireAuth, async (req, res) => {
  try {
    const { taskId } = req.body

    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' })
    }

    const task = db.data.tasks.find(t => t.id === taskId && t.userId === req.user.id)
    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    // Check if task is already running
    const existingEntry = db.data.entries.find(
      e => e.userId === req.user.id && e.taskId === taskId && e.endTime === null
    )
    if (existingEntry) {
      return res.status(400).json({ error: 'Task is already running', entry: existingEntry })
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

    // Get other active entries for "stop other tasks" feature
    const otherActiveEntries = db.data.entries.filter(
      e => e.userId === req.user.id && e.endTime === null && e.id !== entry.id
    )

    res.status(201).json({ entry, otherActiveEntries })
  } catch (error) {
    console.error('Start task error:', error)
    res.status(500).json({ error: 'Failed to start task' })
  }
})

// Stop task
router.post('/stop', requireAuth, async (req, res) => {
  try {
    const { taskId, entryId } = req.body

    let entry
    if (entryId) {
      entry = db.data.entries.find(
        e => e.id === entryId && e.userId === req.user.id && e.endTime === null
      )
    } else if (taskId) {
      entry = db.data.entries.find(
        e => e.taskId === taskId && e.userId === req.user.id && e.endTime === null
      )
    }

    if (!entry) {
      return res.status(404).json({ error: 'No active entry found' })
    }

    entry.endTime = new Date().toISOString()
    await db.write()

    res.json({ entry })
  } catch (error) {
    console.error('Stop task error:', error)
    res.status(500).json({ error: 'Failed to stop task' })
  }
})

// Stop all active tasks
router.post('/stop-all', requireAuth, async (req, res) => {
  try {
    const activeEntries = db.data.entries.filter(
      e => e.userId === req.user.id && e.endTime === null
    )

    const endTime = new Date().toISOString()
    activeEntries.forEach(entry => {
      entry.endTime = endTime
    })

    await db.write()

    res.json({ stoppedCount: activeEntries.length, entries: activeEntries })
  } catch (error) {
    console.error('Stop all error:', error)
    res.status(500).json({ error: 'Failed to stop tasks' })
  }
})

// Create manual entry
router.post('/', requireAuth, async (req, res) => {
  try {
    const { taskId, startTime, endTime, comment } = req.body

    if (!taskId || !startTime || !endTime) {
      return res.status(400).json({ error: 'taskId, startTime, and endTime are required' })
    }

    const task = db.data.tasks.find(t => t.id === taskId && t.userId === req.user.id)
    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    const entry = {
      id: uuidv4(),
      userId: req.user.id,
      taskId,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      comment: comment || null,
      createdAt: new Date().toISOString()
    }

    db.data.entries.push(entry)
    await db.write()

    res.status(201).json({ entry })
  } catch (error) {
    console.error('Create entry error:', error)
    res.status(500).json({ error: 'Failed to create entry' })
  }
})

// Update entry
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { startTime, endTime, comment } = req.body

    const entry = db.data.entries.find(e => e.id === id && e.userId === req.user.id)

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' })
    }

    if (startTime !== undefined) entry.startTime = new Date(startTime).toISOString()
    if (endTime !== undefined) entry.endTime = endTime ? new Date(endTime).toISOString() : null
    if (comment !== undefined) entry.comment = comment

    await db.write()

    res.json({ entry })
  } catch (error) {
    console.error('Update entry error:', error)
    res.status(500).json({ error: 'Failed to update entry' })
  }
})

// Delete entry
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const entry = db.data.entries.find(e => e.id === id && e.userId === req.user.id)

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' })
    }

    db.data.entries = db.data.entries.filter(e => e.id !== id)
    await db.write()

    res.json({ success: true })
  } catch (error) {
    console.error('Delete entry error:', error)
    res.status(500).json({ error: 'Failed to delete entry' })
  }
})

// Export as CSV
router.get('/export', requireAuth, (req, res) => {
  const { startDate, endDate } = req.query

  let entries = db.data.entries.filter(e => e.userId === req.user.id)

  if (startDate) {
    entries = entries.filter(e => new Date(e.startTime) >= new Date(startDate))
  }

  if (endDate) {
    entries = entries.filter(e => new Date(e.startTime) <= new Date(endDate))
  }

  // Sort by start time
  entries.sort((a, b) => new Date(a.startTime) - new Date(b.startTime))

  // Build CSV
  const tasks = db.data.tasks.filter(t => t.userId === req.user.id)
  const tags = db.data.tags.filter(t => t.userId === req.user.id)

  const header = 'Task,Tags,Start Time,End Time,Duration (minutes),Comment\n'
  const rows = entries.map(e => {
    const task = tasks.find(t => t.id === e.taskId)
    const taskName = task ? task.name : 'Unknown'
    const taskTags = task ? task.tags.map(tagId => {
      const tag = tags.find(t => t.id === tagId)
      return tag ? tag.name : ''
    }).filter(Boolean).join('; ') : ''

    const start = new Date(e.startTime)
    const end = e.endTime ? new Date(e.endTime) : new Date()
    const duration = Math.round((end - start) / 60000)

    const escapeCsv = (str) => {
      if (!str) return ''
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    return [
      escapeCsv(taskName),
      escapeCsv(taskTags),
      e.startTime,
      e.endTime || '',
      duration,
      escapeCsv(e.comment || '')
    ].join(',')
  }).join('\n')

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="traq-export.csv"')
  res.send(header + rows)
})

export default router
