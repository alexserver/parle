import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
// TODO: uncomment later
// import { logger } from './logger'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null

export async function transcribeAudio(filePath: string, conversationId: string): Promise<string> {
  if (!openai) {
    const filename = path.basename(filePath)
    // TODO: uncomment later
    // logger.info('Using mock transcription service', { conversationId, filename, reason: 'no_openai_key' })
    return `[MOCK TRANSCRIPT for ${filename}] This is a mock transcription because no OpenAI API key was provided. The audio would have been transcribed here.`
  }

  try {
    // TODO: uncomment later
    // logger.openaiRequest(conversationId, 'whisper-1', 'transcription')
    const audioFile = fs.createReadStream(filePath)
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1'
    })
    
    // TODO: uncomment later
    // logger.info('OpenAI transcription completed', { 
    //   conversationId, 
    //   textLength: transcription.text.length,
    //   model: 'whisper-1'
    // })
    
    return transcription.text
  } catch (error) {
    // TODO: uncomment later
    // logger.error('OpenAI transcription failed', { 
    //   conversationId, 
    //   error: error instanceof Error ? error.message : 'Unknown error',
    //   model: 'whisper-1'
    // })
    throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}