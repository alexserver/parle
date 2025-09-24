import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { health } from './health'
import { upload } from './upload'
import { transcripts } from './transcripts'

const app = new Hono()

app.use('/*', cors())

app.route('/health', health)
app.route('/upload', upload)
app.route('/transcripts', transcripts)

export { app }