const getTimestamp = () => new Date().toISOString()

const writeLog = (level: string, message: string, data?: any) => {
  const timestamp = getTimestamp()
  const logEntry = {
    timestamp,
    level,
    message,
    ...(data && { data })
  }
  
  // Use structured JSON logging for production (Fly.io can capture these)
  if (process.env.NODE_ENV === 'production') {
    console.log(JSON.stringify(logEntry))
  } else {
    // Human-readable format for development
    const consoleMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`
    if (data) {
      console.log(consoleMessage, data)
    } else {
      console.log(consoleMessage)
    }
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