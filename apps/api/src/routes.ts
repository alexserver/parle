import { Hono } from 'hono'
import { cors } from 'hono/cors'
import fs from 'fs/promises'
import path from 'path'
import { prisma } from './prisma'
import { transcribeAudio } from './services/transcribe'
import { summarizeTranscript } from './services/summarize'
import { UploadResponse, HealthResponse } from './types'
import { logger } from './services/logger'

const app = new Hono()

app.use('/*', cors())

app.get('/health', (c) => {
  const response: HealthResponse = { ok: true }
  return c.json(response)
})

app.post('/upload', async (c) => {
  try {
    const body = await c.req.parseBody()
    const audioFile = body.audio as File

    if (!audioFile) {
      logger.warn('Upload rejected: No audio file provided')
      return c.json({ error: 'No audio file provided' }, 400)
    }

    if (!audioFile.type.startsWith('audio/')) {
      logger.warn('Upload rejected: Invalid file type', { type: audioFile.type, filename: audioFile.name })
      return c.json({ error: 'File must be an audio file' }, 400)
    }

    const uploadsDir = path.join(process.cwd(), 'uploads')
    await fs.mkdir(uploadsDir, { recursive: true })

    const fileExtension = path.extname(audioFile.name)
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExtension}`
    const storagePath = path.join(uploadsDir, filename)

    const arrayBuffer = await audioFile.arrayBuffer()
    await fs.writeFile(storagePath, Buffer.from(arrayBuffer))

    let conversation = await prisma.conversation.create({
      data: {
        originalFilename: audioFile.name,
        storagePath,
        mimeType: audioFile.type,
        sizeBytes: audioFile.size,
        status: 'initial'
      }
    })

    logger.uploadStart(audioFile.name, audioFile.size, conversation.id)
    logger.uploadSuccess(audioFile.name, conversation.id, storagePath)

    try {
      logger.transcriptionStart(conversation.id, storagePath)
      const transcriptText = await transcribeAudio(storagePath, conversation.id)
      
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
    console.error('Upload error:', error)
    return c.json({ error: 'Upload failed' }, 500)
  }
})

app.get('/transcripts/:id', async (c) => {
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
    console.error('Get transcript error:', error)
    return c.json({ error: 'Failed to get transcript' }, 500)
  }
})

export { app }