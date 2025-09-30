import OpenAI from 'openai'
// TODO: uncomment later
// import { logger } from './logger'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null

export async function summarizeTranscript(text: string, conversationId: string): Promise<string> {
  if (!openai) {
    // TODO: uncomment later
    // logger.info('Using mock summarization service', { conversationId, reason: 'no_openai_key' })
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const firstSentences = sentences.slice(0, 3).join('. ')
    return `${firstSentences}... TODO: This is a mock summary because no OpenAI API key was provided.`
  }

  try {
    // TODO: uncomment later
    // logger.openaiRequest(conversationId, 'gpt-3.5-turbo', 'summarization')
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes audio transcripts. Provide a concise summary in 1-3 sentences.'
        },
        {
          role: 'user',
          content: `Please summarize this transcript: ${text}`
        }
      ],
      max_tokens: 150,
      temperature: 0.3
    })

    const summary = completion.choices[0]?.message?.content || 'Summary could not be generated.'
    // TODO: uncomment later
    // logger.info('OpenAI summarization completed', { 
    //   conversationId, 
    //   summaryLength: summary.length,
    //   model: 'gpt-3.5-turbo'
    // })

    return summary
  } catch (error) {
    // TODO: uncomment later
    // logger.error('OpenAI summarization failed', { 
    //   conversationId, 
    //   error: error instanceof Error ? error.message : 'Unknown error',
    //   model: 'gpt-3.5-turbo'
    // })
    throw new Error(`Failed to summarize transcript: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}