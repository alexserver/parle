import { Hono } from 'hono'
import path from 'path'
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

transcripts.post('/:id/re-upload', async (c) => {
  try {
    const id = c.req.param('id')
    const userId = c.get('userId')
    
    logger.info('Re-upload request', { userId, conversationId: id })
    
    // Find the conversation and verify ownership
    const conversation = await prisma.conversation.findFirst({
      where: { 
        id,
        userId // Ensure user can only re-upload their own conversations
      }
    })

    if (!conversation) {
      logger.warn('Re-upload attempt - conversation not found or access denied', { userId, conversationId: id })
      return c.json({ error: 'Conversation not found' }, 404)
    }

    // Verify conversation is in failed upload state (status='initial' and no storagePath)
    if (conversation.status !== 'initial' || (conversation.storagePath && conversation.storagePath.trim() !== '')) {
      logger.warn('Re-upload attempt - conversation not in failed upload state', { 
        userId, 
        conversationId: id, 
        status: conversation.status, 
        hasStoragePath: !!conversation.storagePath 
      })
      return c.json({ error: 'Conversation is not in a failed upload state' }, 400)
    }

    // Parse the uploaded file
    const body = await c.req.parseBody()
    const audioFile = body.audio as File

    if (!audioFile) {
      logger.warn('Re-upload rejected: No audio file provided', { userId, conversationId: id })
      return c.json({ error: 'No audio file provided' }, 400)
    }

    // Validate file type and size (reuse validation logic from upload route)
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'video/mp4']
    const allowedExtensions = ['.mp3', '.mp4', '.m4a']
    const fileExtension = path.extname(audioFile.name)
    
    if (!allowedTypes.includes(audioFile.type) && !allowedExtensions.includes(fileExtension.toLowerCase())) {
      logger.warn('Re-upload rejected: Invalid file type', { 
        userId,
        conversationId: id,
        type: audioFile.type, 
        filename: audioFile.name,
        allowedTypes,
        allowedExtensions
      })
      return c.json({ error: 'Only MP3, MP4, and M4A files are supported' }, 400)
    }

    // Check file size (25MB limit for OpenAI Whisper)
    const maxSize = 25 * 1024 * 1024 // 25MB in bytes
    if (audioFile.size > maxSize) {
      logger.warn('Re-upload rejected: File too large', { 
        userId,
        conversationId: id,
        size: audioFile.size, 
        maxSize, 
        filename: audioFile.name 
      })
      return c.json({ error: 'File size must be 25MB or less' }, 400)
    }

    // Generate new object key for R2 storage
    const objectKey = `uploads/user/${userId}/${id}${fileExtension}`
    
    // Upload file to R2 storage
    const storageService = StorageFactory.createStorageService()
    const uploadResult = await storageService.uploadFile(audioFile, objectKey)

    // Update conversation with file metadata and storage path
    let updatedConversation = await prisma.conversation.update({
      where: { id },
      data: {
        originalFilename: audioFile.name,
        storagePath: uploadResult.key,
        mimeType: audioFile.type,
        sizeBytes: audioFile.size,
        errorMessage: null, // Clear any previous error messages
        updatedAt: new Date()
      }
    })

    logger.info('File re-uploaded successfully', { 
      userId, 
      conversationId: id, 
      filename: audioFile.name,
      size: audioFile.size,
      storageKey: uploadResult.key 
    })

    try {
      // Start transcription process
      logger.info('Starting transcription for re-uploaded file', { userId, conversationId: id })
      const transcriptText = await transcribeAudio(uploadResult.key, id)
      
      // Update conversation with transcript
      updatedConversation = await prisma.conversation.update({
        where: { id },
        data: {
          transcriptText,
          status: 'transcribed',
          updatedAt: new Date()
        }
      })

      const isRealTranscription = !transcriptText.startsWith('[MOCK TRANSCRIPT')
      logger.info('Transcription completed for re-uploaded file', { 
        userId, 
        conversationId: id, 
        transcriptLength: transcriptText.length,
        isRealTranscription 
      })

      try {
        // Start summarization process
        logger.info('Starting summarization for re-uploaded file', { userId, conversationId: id })
        const summaryText = await summarizeTranscript(transcriptText, id)
        
        // Update conversation with summary
        updatedConversation = await prisma.conversation.update({
          where: { id },
          data: {
            summaryText,
            status: 'summarized',
            updatedAt: new Date()
          }
        })

        const isRealSummary = !summaryText.includes('TODO: This is a mock summary')
        logger.info('Summarization completed for re-uploaded file', { 
          userId, 
          conversationId: id, 
          summaryLength: summaryText.length,
          isRealSummary 
        })
        
      } catch (summaryError) {
        const errorMessage = summaryError instanceof Error ? summaryError.message : 'Unknown summarization error'
        logger.error('Summarization failed for re-uploaded file', {
          userId,
          conversationId: id,
          error: errorMessage
        })
        // Note: Don't update status to failed since transcription succeeded
      }
      
    } catch (transcribeError) {
      const errorMessage = transcribeError instanceof Error ? transcribeError.message : 'Unknown transcription error'
      logger.error('Transcription failed for re-uploaded file', {
        userId,
        conversationId: id,
        storageKey: uploadResult.key,
        error: errorMessage
      })
      
      // Update conversation with error status
      await prisma.conversation.update({
        where: { id },
        data: {
          status: 'failed',
          errorMessage: `Transcription failed: ${errorMessage}`,
          updatedAt: new Date()
        }
      })
      
      return c.json({ error: 'File uploaded successfully but transcription failed' }, 422)
    }

    logger.info('Re-upload process completed successfully', { 
      userId, 
      conversationId: id, 
      finalStatus: updatedConversation.status 
    })
    
    return c.json(updatedConversation)
    
  } catch (error) {
    const userId = c.get('userId')
    const conversationId = c.req.param('id')
    logger.error('Re-upload error', { 
      userId,
      conversationId,
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
    return c.json({ error: 'Re-upload failed' }, 500)
  }
})

export { transcripts }