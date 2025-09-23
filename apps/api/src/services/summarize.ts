import OpenAI from 'openai'

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null

export async function summarizeTranscript(text: string): Promise<string> {
  if (!openai) {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const firstSentences = sentences.slice(0, 3).join('. ')
    return `${firstSentences}... TODO: This is a mock summary because no OpenAI API key was provided.`
  }

  try {
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

    return completion.choices[0]?.message?.content || 'Summary could not be generated.'
  } catch (error) {
    console.error('Summarization error:', error)
    throw new Error(`Failed to summarize transcript: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}