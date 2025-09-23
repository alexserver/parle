import { serve } from '@hono/node-server'
import { app } from './routes'

const port = parseInt(process.env.PORT || '3000')

console.log(`Starting server on port ${port}`)

serve({
  fetch: app.fetch,
  port
})