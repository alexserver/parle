import { Hono } from 'hono'
import path from 'path'
import { prisma } from '../prisma'
import { transcribeAudio } from '../services/transcribe'
import { summarizeTranscript } from '../services/summarize'
import { UploadResponse } from '../types'
import { StorageFactory } from '../services/storage/StorageFactory'
import { logger } from '../services/logger'
import { authMiddleware } from '../middleware/auth'

const upload = new Hono()

// Apply authentication middleware to all upload routes
upload.use('*', authMiddleware)

upload.post('/', async (c) => {
  try {
    // Get authenticated user ID
    const userId = c.get('userId')
    
    const body = await c.req.parseBody()
    const audioFile = body.audio as File

    if (!audioFile) {
      logger.warn('Upload rejected: No audio file provided', { userId })
      return c.json({ error: 'No audio file provided' }, 400)
    }

    // Check file type - support mp3, mp4, m4a
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'video/mp4']
    const allowedExtensions = ['.mp3', '.mp4', '.m4a']
    const fileExtension = path.extname(audioFile.name)
    
    if (!allowedTypes.includes(audioFile.type) && !allowedExtensions.includes(fileExtension.toLowerCase())) {
      logger.warn('Upload rejected: Invalid file type', { 
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
      logger.warn('Upload rejected: File too large', { 
        size: audioFile.size, 
        maxSize, 
        filename: audioFile.name 
      })
      return c.json({ error: 'File size must be 25MB or less' }, 400)
    }

    // Create conversation record first to get ID
    let conversation = await prisma.conversation.create({
      data: {
        userId, // Associate conversation with authenticated user
        originalFilename: audioFile.name,
        storagePath: '', // Temporary, will be updated after upload
        mimeType: audioFile.type,
        sizeBytes: audioFile.size,
        status: 'initial'
      }
    })

    // Generate object key with user-based path
    const objectKey = `uploads/user/${userId}/${conversation.id}${fileExtension}`
    
    // Upload to R2 instead of local storage
    const storageService = StorageFactory.createStorageService()
    const uploadResult = await storageService.uploadFile(audioFile, objectKey)

    // Update conversation with R2 key
    conversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        storagePath: uploadResult.key // Store R2 key instead of local path
      }
    })

    logger.uploadStart(audioFile.name, audioFile.size, conversation.id)
    logger.uploadSuccess(audioFile.name, conversation.id, uploadResult.key)

    try {
      logger.transcriptionStart(conversation.id, uploadResult.key)
      const transcriptText = await transcribeAudio(uploadResult.key, conversation.id)
      
      conversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          transcriptText,
          status: 'transcribed'
        }
      })

      const isRealTranscription = !transcriptText.startsWith('[MOCK TRANSCRIPT')
      logger.transcriptionSuccess(conversation.id, transcriptText.length, isRealTranscription)

      try {
        logger.summarizationStart(conversation.id, transcriptText.length)
        const summaryText = await summarizeTranscript(transcriptText, conversation.id)
        
        conversation = await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            summaryText,
            status: 'summarized'
          }
        })

        const isRealSummary = !summaryText.includes('TODO: This is a mock summary')
        logger.summarizationSuccess(conversation.id, summaryText.length, isRealSummary)
      } catch (summaryError) {
        const errorMessage = summaryError instanceof Error ? summaryError.message : 'Unknown summarization error'
        logger.summarizationError(conversation.id, errorMessage)
      }
    } catch (transcribeError) {
      const errorMessage = transcribeError instanceof Error ? transcribeError.message : 'Unknown transcription error'
      logger.transcriptionError(conversation.id, errorMessage)
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: 'failed',
          errorMessage
        }
      })
      return c.json({ error: 'Transcription failed' }, 500)
    }

    const transcriptPreview = conversation.transcriptText?.substring(0, 300)
    const response: UploadResponse = {
      id: conversation.id,
      status: conversation.status,
      transcriptPreview,
      summary: conversation.summaryText || undefined
    }

    return c.json(response)
  } catch (error) {
    logger.error('Upload error', { error: error instanceof Error ? error.message : 'Unknown error' })
    return c.json({ error: 'Upload failed' }, 500)
  }
})

export { upload }