import { Hono } from 'hono'
import { prisma } from '../prisma'
import { logger } from '../services/logger'
import { authMiddleware } from '../middleware/auth'

const transcripts = new Hono()

// Apply authentication middleware to all transcript routes
transcripts.use('*', authMiddleware)

transcripts.get('/', async (c) => {
  try {
    const userId = c.get('userId')
    
    const conversations = await prisma.conversation.findMany({
      where: {
        userId // Only return conversations for the authenticated user
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    logger.info('Retrieved user transcripts', { userId, count: conversations.length })
    return c.json(conversations)
  } catch (error) {
    const userId = c.get('userId')
    logger.error('Failed to get user transcripts', { 
      userId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return c.json({ error: 'Failed to get transcripts' }, 500)
  }
})

transcripts.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const userId = c.get('userId')
    
    const conversation = await prisma.conversation.findFirst({
      where: { 
        id,
        userId // Ensure user can only access their own transcripts
      }
    })

    if (!conversation) {
      logger.warn('Transcript access denied or not found', { userId, transcriptId: id })
      return c.json({ error: 'Transcript not found' }, 404)
    }

    logger.info('Retrieved transcript', { userId, transcriptId: id })
    return c.json(conversation)
  } catch (error) {
    const userId = c.get('userId')
    const transcriptId = c.req.param('id')
    logger.error('Get transcript error', { 
      userId,
      transcriptId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return c.json({ error: 'Failed to get transcript' }, 500)
  }
})

export { transcripts }