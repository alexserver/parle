import { Hono } from 'hono'
import { prisma } from '../prisma'
import { logger } from '../services/logger'

const transcripts = new Hono()

transcripts.get('/', async (c) => {
  try {
    const conversations = await prisma.conversation.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    logger.info('Retrieved all transcripts', { count: conversations.length })
    return c.json(conversations)
  } catch (error) {
    logger.error('Failed to get all transcripts', { error: error instanceof Error ? error.message : 'Unknown error' })
    return c.json({ error: 'Failed to get transcripts' }, 500)
  }
})

transcripts.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const conversation = await prisma.conversation.findUnique({
      where: { id }
    })

    if (!conversation) {
      return c.json({ error: 'Transcript not found' }, 404)
    }

    return c.json(conversation)
  } catch (error) {
    logger.error('Get transcript error', { error: error instanceof Error ? error.message : 'Unknown error' })
    return c.json({ error: 'Failed to get transcript' }, 500)
  }
})

export { transcripts }