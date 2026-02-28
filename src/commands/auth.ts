import { ClickUpClient } from '../api.js'
import type { Config } from '../config.js'

export interface AuthResult {
  authenticated: boolean
  user?: { id: number; username: string }
  error?: string
}

export async function checkAuth(config: Config): Promise<AuthResult> {
  const client = new ClickUpClient(config)
  try {
    const user = await client.getMe()
    return { authenticated: true, user }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { authenticated: false, error: message }
  }
}
