import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

export const name = 'dsh-grok-desktop'

const PROVIDER_ID = 'grok-desktop'
const MODELS = [
  { id: 'grok-4', name: 'Grok 4', contextWindow: 256000, maxTokens: 32000 },
  { id: 'grok-4-fast', name: 'Grok 4 Fast', contextWindow: 2000000, maxTokens: 32000 },
  { id: 'grok-3', name: 'Grok 3', contextWindow: 131072, maxTokens: 16000 },
]

function home() {
  const env = process.env.DSH_HOME
  if (env && env.trim()) return resolve(env.trim())
  return join(homedir(), '.dsh')
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function tokenFrom(value) {
  if (!value || typeof value !== 'object') return ''
  const direct = value.access_token || value.accessToken || value.apiKey || value.token
  if (typeof direct === 'string' && direct.length > 20) return direct
  for (const key of ['oauth', 'credentials', 'auth', 'xai']) {
    const nested = tokenFrom(value[key])
    if (nested) return nested
  }
  return ''
}

function findToken() {
  if (process.env.XAI_API_KEY && process.env.XAI_API_KEY.trim()) {
    return { token: process.env.XAI_API_KEY.trim(), source: 'XAI_API_KEY' }
  }
  const candidates = [
    join(homedir(), '.grok', 'auth.json'),
    join(home(), '.xai-oauth-auth.json'),
    join(home(), 'grok-oauth.json'),
    join(home(), 'storages', 'grok-desktop-token.json'),
  ]
  for (const path of candidates) {
    const token = tokenFrom(readJson(path))
    if (token) return { token, source: path }
  }
  return { token: '', source: '' }
}

function writeStatus(status) {
  const dir = join(home(), 'storages')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'grok-desktop-status.json'), JSON.stringify(status, null, 2), 'utf8')
}

function syncSettings(token) {
  const path = join(home(), 'settings.yaml')
  const provider = [
    `  ${PROVIDER_ID}:`,
    `    displayName: Grok`,
    `    api: openai-completions`,
    `    baseURL: https://api.x.ai/v1`,
    `    apiKey: ${JSON.stringify(token)}`,
    `    models:`,
    ...MODELS.flatMap((m) => [
      `      - id: ${m.id}`,
      `        name: ${JSON.stringify(m.name)}`,
      `        contextWindow: ${m.contextWindow}`,
      `        maxTokens: ${m.maxTokens}`,
      `        input: [text]`,
    ]),
  ].join('\n')

  let text = ''
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    text = ''
  }

  const block = `${PROVIDER_ID}:`
  if (!text.includes('llm-pi-ai:')) {
    const next = `${text.trim()}\n\nllm-pi-ai:\n  providers:\n${provider}\n`
    writeFileSync(path, next.trimStart(), 'utf8')
    return
  }
  if (text.includes(block)) {
    text = text.replace(
      new RegExp(`  ${PROVIDER_ID}:[\\s\\S]*?(?=\\n  [a-zA-Z0-9_-]+:|\\n[a-zA-Z]|$)`),
      `${provider}\n`,
    )
    writeFileSync(path, text, 'utf8')
    return
  }
  if (text.includes('providers:')) {
    text = text.replace(/providers:\n/, `providers:\n${provider}\n`)
    writeFileSync(path, text, 'utf8')
    return
  }
  text = text.replace(/llm-pi-ai:\n/, `llm-pi-ai:\n  providers:\n${provider}\n`)
  writeFileSync(path, text, 'utf8')
}

export function apply(ctx) {
  try {
    const found = findToken()
    if (!found.token) {
      writeStatus({
        ok: false,
        reason: 'no-token',
        hint: 'Run grok login, or put an API key in XAI_API_KEY, then restart the desktop app.',
      })
      ctx?.logger?.warn?.('[dsh-grok-desktop] no token yet; desktop stays up')
      return
    }
    syncSettings(found.token)
    writeStatus({ ok: true, source: found.source, provider: PROVIDER_ID, at: new Date().toISOString() })
    ctx?.logger?.info?.(`[dsh-grok-desktop] registered ${PROVIDER_ID} from ${found.source}`)
  } catch (error) {
    try {
      writeStatus({ ok: false, reason: String(error?.message || error) })
    } catch {}
    ctx?.logger?.warn?.(`[dsh-grok-desktop] skipped: ${error?.message || error}`)
  }
}

void dirname
