import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { health } from './health'
import { upload } from './upload'
import { transcripts } from './transcripts'

const app = new Hono()

// Environment-based CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:5173'] // Default to dev origins

const corsConfig = {
  origin: allowedOrigins,
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-User-Id'],
  credentials: false,
}

app.use('/*', cors(corsConfig))
app.use('/*', secureHeaders())

app.route('/health', health)
app.route('/upload', upload)
app.route('/transcripts', transcripts)

export { app }