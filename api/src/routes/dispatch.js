import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import OpenAI from 'openai'
import db from '../db/index.js'

const router = Router()

const BASE_URL = process.env.BASE_URL || 'https://traq.michoest.com'
const DISPATCH_API_KEY = process.env.DISPATCH_API_KEY
const DISPATCH_USER_ID = process.env.DISPATCH_USER_ID

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Dispatch auth middleware (x-api-key header)
function dispatchAuth(req, res, next) {
  const apiKey = req.headers['x-api-key']
  if (apiKey !== DISPATCH_API_KEY) {
    return res.status(403).json({ error: 'Invalid API key' })
  }
  next()
}

// Find task by name using OpenAI
async function findTaskByName(tasks, input) {
  if (tasks.length === 0) {
    return { taskId: null, confidence: 'none' }
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a task matcher. Match the user's input to the most appropriate task from the list. Return JSON only: {"taskId": "the-matching-id" or null if no match, "confidence": "high"|"medium"|"low"|"none"}`
      },
      {
        role: 'user',
        content: `Input: "${input}"\n\nAvailable tasks:\n${tasks.map(t => `- ${t.id}: ${t.name}`).join('\n')}`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0
  })

  return JSON.parse(response.choices[0].message.content)
}

// Health check (no auth required)
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'traq'
  })
})

// Service documentation (for dispatcher LLM)
router.get('/docs', dispatchAuth, (req, res) => {
  res.json({
    name: 'traq',
    description: 'Time tracking app - start and stop timing tasks',
    endpoints: [
      {
        method: 'POST',
        path: '/dispatch/tasks/start',
        description: 'Start tracking time on a task. Use when user wants to begin working on something.',
        parameters: {
          type: 'object',
          properties: {
            task: {
              type: 'string',
              description: 'Name or description of the task to start (e.g., "cello practice", "work", "reading")'
            }
          },
          required: ['task']
        }
      },
      {
        method: 'POST',
        path: '/dispatch/tasks/stop',
        description: 'Stop tracking time on a task. Use when user wants to stop working on something.',
        parameters: {
          type: 'object',
          properties: {
            task: {
              type: 'string',
              description: 'Name or description of the task to stop (e.g., "cello practice", "work", "reading")'
            }
          },
          required: ['task']
        }
      }
    ]
  })
})

// Start a task
router.post('/tasks/start', dispatchAuth, async (req, res) => {
  try {
    const { task: taskInput } = req.body

    if (!taskInput) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: task'
      })
    }

    // Get active tasks for the dispatch user
    const tasks = db.data.tasks.filter(t => t.userId === DISPATCH_USER_ID && t.active)

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No tasks found',
        url: BASE_URL
      })
    }

    // Find matching task using OpenAI
    const match = await findTaskByName(tasks, taskInput)

    if (!match.taskId || match.confidence === 'none') {
      return res.status(404).json({
        success: false,
        error: `No task found matching "${taskInput}"`,
        url: BASE_URL
      })
    }

    const task = tasks.find(t => t.id === match.taskId)

    if (!task) {
      return res.status(404).json({
        success: false,
        error: `Task not found`,
        url: BASE_URL
      })
    }

    // Check if task is already running
    const existingEntry = db.data.entries.find(
      e => e.userId === DISPATCH_USER_ID && e.taskId === task.id && e.endTime === null
    )

    if (existingEntry) {
      return res.json({
        success: true,
        message: `${task.name} is already running`,
        url: BASE_URL
      })
    }

    // Create new entry
    const entry = {
      id: uuidv4(),
      userId: DISPATCH_USER_ID,
      taskId: task.id,
      startTime: new Date().toISOString(),
      endTime: null,
      comment: null,
      createdAt: new Date().toISOString()
    }

    db.data.entries.push(entry)
    await db.write()

    res.status(201).json({
      success: true,
      message: `Started ${task.name}`,
      url: BASE_URL,
      data: { entry, task }
    })
  } catch (error) {
    console.error('Dispatch start error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to start task',
      url: BASE_URL
    })
  }
})

// Stop a task
router.post('/tasks/stop', dispatchAuth, async (req, res) => {
  try {
    const { task: taskInput } = req.body

    if (!taskInput) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: task'
      })
    }

    // Get active tasks for the dispatch user
    const tasks = db.data.tasks.filter(t => t.userId === DISPATCH_USER_ID && t.active)

    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No tasks found',
        url: BASE_URL
      })
    }

    // Find matching task using OpenAI
    const match = await findTaskByName(tasks, taskInput)

    if (!match.taskId || match.confidence === 'none') {
      return res.status(404).json({
        success: false,
        error: `No task found matching "${taskInput}"`,
        url: BASE_URL
      })
    }

    const task = tasks.find(t => t.id === match.taskId)

    if (!task) {
      return res.status(404).json({
        success: false,
        error: `Task not found`,
        url: BASE_URL
      })
    }

    // Find running entry for this task
    const entry = db.data.entries.find(
      e => e.userId === DISPATCH_USER_ID && e.taskId === task.id && e.endTime === null
    )

    if (!entry) {
      return res.json({
        success: true,
        message: `${task.name} is not running`,
        url: BASE_URL
      })
    }

    // Stop the entry
    entry.endTime = new Date().toISOString()
    await db.write()

    const duration = Math.round((new Date(entry.endTime) - new Date(entry.startTime)) / 60000)

    res.json({
      success: true,
      message: `Stopped ${task.name} (${duration} min)`,
      url: BASE_URL,
      data: { entry, task, duration }
    })
  } catch (error) {
    console.error('Dispatch stop error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to stop task',
      url: BASE_URL
    })
  }
})

export default router
