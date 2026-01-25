import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Get all tags for user
router.get('/', requireAuth, (req, res) => {
  const tags = db.data.tags
    .filter(t => t.userId === req.user.id)
    .sort((a, b) => a.order - b.order)
  res.json({ tags })
})

// Create tag
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, color, icon } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' })
    }

    // Get max order for user's tags
    const userTags = db.data.tags.filter(t => t.userId === req.user.id)
    const maxOrder = userTags.length > 0 ? Math.max(...userTags.map(t => t.order)) : -1

    const tag = {
      id: uuidv4(),
      userId: req.user.id,
      name,
      color: color || '#6B7CFF',
      icon: icon || 'mdi-tag',
      order: maxOrder + 1,
      createdAt: new Date().toISOString()
    }

    db.data.tags.push(tag)
    await db.write()

    res.status(201).json({ tag })
  } catch (error) {
    console.error('Create tag error:', error)
    res.status(500).json({ error: 'Failed to create tag' })
  }
})

// Update tag
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { name, color, icon } = req.body

    const tag = db.data.tags.find(t => t.id === id && t.userId === req.user.id)

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' })
    }

    if (name !== undefined) tag.name = name
    if (color !== undefined) tag.color = color
    if (icon !== undefined) tag.icon = icon

    await db.write()

    res.json({ tag })
  } catch (error) {
    console.error('Update tag error:', error)
    res.status(500).json({ error: 'Failed to update tag' })
  }
})

// Reorder tags
router.put('/reorder', requireAuth, async (req, res) => {
  try {
    const { tagIds } = req.body

    if (!Array.isArray(tagIds)) {
      return res.status(400).json({ error: 'tagIds array is required' })
    }

    tagIds.forEach((id, index) => {
      const tag = db.data.tags.find(t => t.id === id && t.userId === req.user.id)
      if (tag) {
        tag.order = index
      }
    })

    await db.write()

    const tags = db.data.tags
      .filter(t => t.userId === req.user.id)
      .sort((a, b) => a.order - b.order)

    res.json({ tags })
  } catch (error) {
    console.error('Reorder tags error:', error)
    res.status(500).json({ error: 'Failed to reorder tags' })
  }
})

// Delete tag
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const tag = db.data.tags.find(t => t.id === id && t.userId === req.user.id)

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' })
    }

    // Remove tag from all tasks
    db.data.tasks.forEach(task => {
      if (task.userId === req.user.id) {
        task.tags = task.tags.filter(tagId => tagId !== id)
      }
    })

    db.data.tags = db.data.tags.filter(t => t.id !== id)
    await db.write()

    res.json({ success: true })
  } catch (error) {
    console.error('Delete tag error:', error)
    res.status(500).json({ error: 'Failed to delete tag' })
  }
})

export default router
