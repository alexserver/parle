import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
import { logger } from './logger'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null

export async function transcribeAudio(filePath: string, conversationId: string): Promise<string> {
  if (!openai) {
    const filename = path.basename(filePath)
    logger.info('Using mock transcription service', { conversationId, filename, reason: 'no_openai_key' })
    return `[MOCK TRANSCRIPT for ${filename}] This is a mock transcription because no OpenAI API key was provided. The audio would have been transcribed here.`
  }

  try {
    logger.openaiRequest(conversationId, 'whisper-1', 'transcription')
    const audioFile = fs.createReadStream(filePath)
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1'
    })
    
    logger.info('OpenAI transcription completed', { 
      conversationId, 
      textLength: transcription.text.length,
      model: 'whisper-1'
    })
    
    return transcription.text
  } catch (error) {
    logger.error('OpenAI transcription failed', { 
      conversationId, 
      error: error instanceof Error ? error.message : 'Unknown error',
      model: 'whisper-1'
    })
    throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}