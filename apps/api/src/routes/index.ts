import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { health } from './health'
import { upload } from './upload'
import { transcripts } from './transcripts'
import { auth } from './auth'

const app = new Hono()

// Environment-based CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5173'] // Default to dev origins

const corsConfig = {
  origin: allowedOrigins,
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}

// Root route for status check (no CORS)
app.get('/', (c) => {
  return c.json({
    service: 'Parle API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  })
})

app.use('/*', cors(corsConfig))
app.use('/*', secureHeaders())

app.route('/health', health)
app.route('/auth', auth)
app.route('/upload', upload)
app.route('/transcripts', transcripts)

export { app }