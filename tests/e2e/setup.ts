import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.test') })

if (!process.env.CLICKUP_API_TOKEN) {
  console.warn('[e2e] CLICKUP_API_TOKEN not set - all e2e tests will be skipped')
}
