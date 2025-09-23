import fs from 'fs'
import path from 'path'

const logsDir = path.join(process.cwd(), 'logs')

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

const getTimestamp = () => new Date().toISOString()

const getLogFileName = () => {
  const today = new Date().toISOString().split('T')[0]
  return path.join(logsDir, `transcriber-${today}.log`)
}

const writeLog = (level: string, message: string, data?: any) => {
  const timestamp = getTimestamp()
  const logEntry = {
    timestamp,
    level,
    message,
    ...(data && { data })
  }
  
  const logLine = JSON.stringify(logEntry) + '\n'
  const logFile = getLogFileName()
  
  try {
    fs.appendFileSync(logFile, logLine)
  } catch (error) {
    console.error('Failed to write to log file:', error)
  }
  
  // Also log to console for development
  const consoleMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`
  if (data) {
    console.log(consoleMessage, data)
  } else {
    console.log(consoleMessage)
  }
}

export const logger = {
  info: (message: string, data?: any) => writeLog('info', message, data),
  warn: (message: string, data?: any) => writeLog('warn', message, data),
  error: (message: string, data?: any) => writeLog('error', message, data),
  
  // Specific logging methods for our use cases
  uploadStart: (filename: string, fileSize: number, conversationId: string) => {
    writeLog('info', 'File upload started', {
      filename,
      fileSize,
      conversationId,
      action: 'upload_start'
    })
  },
  
  uploadSuccess: (filename: string, conversationId: string, storagePath: string) => {
    writeLog('info', 'File upload completed', {
      filename,
      conversationId,
      storagePath,
      action: 'upload_success'
    })
  },
  
  transcriptionStart: (conversationId: string, filePath: string) => {
    writeLog('info', 'Transcription started', {
      conversationId,
      filePath,
      action: 'transcription_start'
    })
  },
  
  transcriptionSuccess: (conversationId: string, transcriptLength: number, isReal: boolean) => {
    writeLog('info', 'Transcription completed', {
      conversationId,
      transcriptLength,
      isReal,
      action: 'transcription_success'
    })
  },
  
  transcriptionError: (conversationId: string, error: string) => {
    writeLog('error', 'Transcription failed', {
      conversationId,
      error,
      action: 'transcription_error'
    })
  },
  
  summarizationStart: (conversationId: string, transcriptLength: number) => {
    writeLog('info', 'Summarization started', {
      conversationId,
      transcriptLength,
      action: 'summarization_start'
    })
  },
  
  summarizationSuccess: (conversationId: string, summaryLength: number, isReal: boolean) => {
    writeLog('info', 'Summarization completed', {
      conversationId,
      summaryLength,
      isReal,
      action: 'summarization_success'
    })
  },
  
  summarizationError: (conversationId: string, error: string) => {
    writeLog('error', 'Summarization failed', {
      conversationId,
      error,
      action: 'summarization_error'
    })
  },
  
  openaiRequest: (conversationId: string, model: string, operation: 'transcription' | 'summarization') => {
    writeLog('info', 'OpenAI API request made', {
      conversationId,
      model,
      operation,
      action: 'openai_request'
    })
  }
}