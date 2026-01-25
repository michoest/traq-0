import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Get all tasks for user
router.get('/', requireAuth, (req, res) => {
  const tasks = db.data.tasks.filter(t => t.userId === req.user.id)
  res.json({ tasks })
})

// Create task
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description, color, icon, tags } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Task name is required' })
    }

    const task = {
      id: uuidv4(),
      userId: req.user.id,
      name,
      description: description || null,
      color: color || null,
      icon: icon || null,
      tags: tags || [],
      active: true,
      createdAt: new Date().toISOString()
    }

    db.data.tasks.push(task)
    await db.write()

    res.status(201).json({ task })
  } catch (error) {
    console.error('Create task error:', error)
    res.status(500).json({ error: 'Failed to create task' })
  }
})

// Update task
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, color, icon, tags, active } = req.body

    const task = db.data.tasks.find(t => t.id === id && t.userId === req.user.id)

    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    if (name !== undefined) task.name = name
    if (description !== undefined) task.description = description
    if (color !== undefined) task.color = color
    if (icon !== undefined) task.icon = icon
    if (tags !== undefined) task.tags = tags
    if (active !== undefined) task.active = active

    await db.write()

    res.json({ task })
  } catch (error) {
    console.error('Update task error:', error)
    res.status(500).json({ error: 'Failed to update task' })
  }
})

// Delete task
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const task = db.data.tasks.find(t => t.id === id && t.userId === req.user.id)

    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    // Also delete all entries for this task
    db.data.entries = db.data.entries.filter(e => e.taskId !== id)
    db.data.tasks = db.data.tasks.filter(t => t.id !== id)
    await db.write()

    res.json({ success: true })
  } catch (error) {
    console.error('Delete task error:', error)
    res.status(500).json({ error: 'Failed to delete task' })
  }
})

export default router
