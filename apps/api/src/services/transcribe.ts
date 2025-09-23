import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null

export async function transcribeAudio(filePath: string): Promise<string> {
  if (!openai) {
    const filename = path.basename(filePath)
    return `[MOCK TRANSCRIPT for ${filename}] This is a mock transcription because no OpenAI API key was provided. The audio would have been transcribed here.`
  }

  try {
    const audioFile = fs.createReadStream(filePath)
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1'
    })
    
    return transcription.text
  } catch (error) {
    console.error('Transcription error:', error)
    throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}