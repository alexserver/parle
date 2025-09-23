import { app } from './routes'

const port = parseInt(process.env.PORT || '3000')

console.log(`Starting server on port ${port}`)

export default {
  port,
  fetch: app.fetch,
}