import { Hono } from 'hono'
import { prisma } from '../prisma'
import { logger } from '../services/logger'
import { authMiddleware } from '../middleware/auth'
import { StorageFactory } from '../services/storage/StorageFactory'
import { transcribeAudio } from '../services/transcribe'
import { summarizeTranscript } from '../services/summarize'

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

transcripts.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const userId = c.get('userId')
    
    logger.info('Delete conversation request', { userId, conversationId: id })
    
    // Find the conversation and verify ownership
    const conversation = await prisma.conversation.findFirst({
      where: { 
        id,
        userId // Ensure user can only delete their own transcripts
      }
    })

    if (!conversation) {
      logger.warn('Delete attempt - conversation not found or access denied', { userId, conversationId: id })
      return c.json({ error: 'Conversation not found' }, 404)
    }

    // Conditionally delete from R2 storage if file was uploaded successfully
    if (conversation.status !== 'initial' && conversation.storagePath) {
      try {
        const storageService = StorageFactory.createStorageService()
        await storageService.deleteFile(conversation.storagePath)
        logger.info('Successfully deleted file from R2', { 
          userId, 
          conversationId: id, 
          storagePath: conversation.storagePath 
        })
      } catch (storageError) {
        // Log storage error but continue with database deletion
        logger.error('Failed to delete file from R2, continuing with database deletion', {
          userId,
          conversationId: id,
          storagePath: conversation.storagePath,
          error: storageError instanceof Error ? storageError.message : 'Unknown storage error'
        })
      }
    } else {
      logger.info('Skipping R2 deletion for conversation with initial status', { 
        userId,
        conversationId: id, 
        status: conversation.status, 
        hasStoragePath: !!conversation.storagePath 
      })
    }

    // Delete the conversation from database
    await prisma.conversation.delete({
      where: { id }
    })

    logger.info('Successfully deleted conversation', { userId, conversationId: id })
    return c.body(null, 204) // No Content
    
  } catch (error) {
    const userId = c.get('userId')
    const conversationId = c.req.param('id')
    logger.error('Delete conversation error', { 
      userId,
      conversationId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return c.json({ error: 'Failed to delete conversation' }, 500)
  }
})

transcripts.put('/:id/regenerate-transcript', async (c) => {
  try {
    const id = c.req.param('id')
    const userId = c.get('userId')
    
    logger.info('Regenerate transcript request', { userId, conversationId: id })
    
    // Find the conversation and verify ownership
    const conversation = await prisma.conversation.findFirst({
      where: { 
        id,
        userId // Ensure user can only regenerate their own transcripts
      }
    })

    if (!conversation) {
      logger.warn('Regenerate transcript attempt - conversation not found or access denied', { userId, conversationId: id })
      return c.json({ error: 'Conversation not found' }, 404)
    }

    // Verify that the conversation has a valid storage path (audio file exists)
    if (!conversation.storagePath) {
      logger.warn('Regenerate transcript attempt - no audio file available', { userId, conversationId: id })
      return c.json({ error: 'No audio file available for regeneration' }, 400)
    }

    logger.info('Starting transcript regeneration', { 
      userId, 
      conversationId: id, 
      storagePath: conversation.storagePath 
    })

    try {
      // Use existing transcription service to regenerate transcript
      const newTranscriptText = await transcribeAudio(conversation.storagePath, id)
      
      // Update conversation with new transcript, clear summary, and set status
      const updatedConversation = await prisma.conversation.update({
        where: { id },
        data: {
          transcriptText: newTranscriptText,
          summaryText: null, // Clear existing summary when transcript changes
          status: 'transcribed',
          errorMessage: null, // Clear any previous errors
          updatedAt: new Date()
        }
      })

      logger.info('Successfully regenerated transcript', { 
        userId, 
        conversationId: id, 
        newTextLength: newTranscriptText.length 
      })
      
      return c.json(updatedConversation)
      
    } catch (transcriptionError) {
      const errorMessage = transcriptionError instanceof Error ? transcriptionError.message : 'Unknown transcription error'
      logger.error('Transcript regeneration failed', {
        userId,
        conversationId: id,
        storagePath: conversation.storagePath,
        error: errorMessage
      })
      
      // Update conversation with error status
      await prisma.conversation.update({
        where: { id },
        data: {
          status: 'failed',
          errorMessage: `Regeneration failed: ${errorMessage}`,
          updatedAt: new Date()
        }
      })
      
      return c.json({ error: 'Failed to regenerate transcript' }, 422)
    }
    
  } catch (error) {
    const userId = c.get('userId')
    const conversationId = c.req.param('id')
    logger.error('Regenerate transcript error', { 
      userId,
      conversationId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return c.json({ error: 'Failed to regenerate transcript' }, 500)
  }
})

transcripts.put('/:id/regenerate-summary', async (c) => {
  try {
    const id = c.req.param('id')
    const userId = c.get('userId')
    
    logger.info('Regenerate summary request', { userId, conversationId: id })
    
    // Find the conversation and verify ownership
    const conversation = await prisma.conversation.findFirst({
      where: { 
        id,
        userId // Ensure user can only regenerate their own summaries
      }
    })

    if (!conversation) {
      logger.warn('Regenerate summary attempt - conversation not found or access denied', { userId, conversationId: id })
      return c.json({ error: 'Conversation not found' }, 404)
    }

    // Verify that the conversation has transcript text to summarize
    if (!conversation.transcriptText || conversation.transcriptText.trim().length === 0) {
      logger.warn('Regenerate summary attempt - no transcript available', { userId, conversationId: id })
      return c.json({ error: 'No transcript available for summarization' }, 400)
    }

    logger.info('Starting summary regeneration', { 
      userId, 
      conversationId: id, 
      transcriptLength: conversation.transcriptText.length 
    })

    try {
      // Use existing summarization service to regenerate summary
      const newSummaryText = await summarizeTranscript(conversation.transcriptText, id)
      
      // Update conversation with new summary and set status
      const updatedConversation = await prisma.conversation.update({
        where: { id },
        data: {
          summaryText: newSummaryText,
          status: 'summarized',
          errorMessage: null, // Clear any previous errors
          updatedAt: new Date()
        }
      })

      logger.info('Successfully regenerated summary', { 
        userId, 
        conversationId: id, 
        newSummaryLength: newSummaryText.length 
      })
      
      return c.json(updatedConversation)
      
    } catch (summarizationError) {
      const errorMessage = summarizationError instanceof Error ? summarizationError.message : 'Unknown summarization error'
      logger.error('Summary regeneration failed', {
        userId,
        conversationId: id,
        transcriptLength: conversation.transcriptText.length,
        error: errorMessage
      })
      
      // Note: We don't set status to 'failed' for summary errors since transcript is still valid
      // Just log the error and return failure response
      return c.json({ error: 'Failed to regenerate summary' }, 422)
    }
    
  } catch (error) {
    const userId = c.get('userId')
    const conversationId = c.req.param('id')
    logger.error('Regenerate summary error', { 
      userId,
      conversationId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return c.json({ error: 'Failed to regenerate summary' }, 500)
  }
})

export { transcripts }