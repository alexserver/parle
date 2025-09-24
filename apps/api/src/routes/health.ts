import { Hono } from 'hono'
import { HealthResponse } from '../types'

const health = new Hono()

health.get('/', (c) => {
  const response: HealthResponse = { ok: true }
  return c.json(response)
})

export { health }