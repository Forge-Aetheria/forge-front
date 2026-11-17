import fs from 'node:fs'

const envFiles = ['.env.local', '.env.production', '.env']

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator <= 0) continue
    const key = trimmed.slice(0, separator).trim()
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '')
    if (process.env[key] === undefined) process.env[key] = value
  }
}

for (const file of envFiles) loadEnvFile(file)

const localHosts = new Set(['localhost', '127.0.0.1', '::1', '10.0.2.2'])

function maskUrl(value) {
  if (!value) return 'unknown'
  try {
    const url = new URL(value)
    return `${url.protocol}//${url.host}${url.pathname}`
  } catch {
    return 'unknown'
  }
}

function classify(value) {
  if (!value) return 'unknown'
  try {
    const host = new URL(value).hostname.toLowerCase()
    return localHosts.has(host) ? 'local' : 'remote'
  } catch {
    return 'unknown'
  }
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL
const graphqlEndpoint = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT
const basePath = process.env.BASEPATH || ''
const unknownFields = []

if (!appUrl) unknownFields.push('NEXT_PUBLIC_APP_URL')
if (!graphqlEndpoint) unknownFields.push('NEXT_PUBLIC_GRAPHQL_ENDPOINT')

const report = {
  component: 'forge-front',
  environment: classify(graphqlEndpoint),
  appUrl: appUrl || 'unknown',
  graphqlEndpoint: maskUrl(graphqlEndpoint),
  basePath,
  unknownFields,
}

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
} else {
  process.stdout.write(
    [
      `[env] Component: ${report.component}`,
      `[env] Environment: ${report.environment}`,
      `[env] App URL: ${report.appUrl}`,
      `[env] GraphQL endpoint: ${report.graphqlEndpoint}`,
      `[env] Base path: ${report.basePath || '(none)'}`,
      report.unknownFields.length > 0
        ? `[env] Unknown fields: ${report.unknownFields.join(', ')}`
        : null,
    ]
      .filter(Boolean)
      .join('\n') + '\n',
  )
}

if (unknownFields.length > 0) process.exitCode = 1
