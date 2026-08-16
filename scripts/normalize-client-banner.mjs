#!/usr/bin/env node
/**
 * Rolldown pretty-prints the tsdown banner into a three-line header, but the
 * published contract (enforced by prepack, and relied on by hosts that sniff
 * the loader id from the file head) requires client/client.js to START with
 * the exact one-line `window.__ModuleLoader__.load({ id: "<name>"` prefix.
 * Collapse the header onto one line, leaving blank lines in place of the
 * folded ones so the sourcemap's line numbers stay valid.
 */
import fs from 'node:fs'

const path = 'client/client.js'
const name = JSON.parse(fs.readFileSync('package.json', 'utf8')).name
const required = `window.__ModuleLoader__.load({ id: ${JSON.stringify(name)}, factory: (require) => {`

const code = fs.readFileSync(path, 'utf8')
if (code.startsWith(required)) process.exit(0)

const lines = code.split('\n')
const head = [
  'window.__ModuleLoader__.load({',
  `\tid: ${JSON.stringify(name)},`,
  '\tfactory: (require) => {',
]
if (lines[0] !== head[0] || lines[1] !== head[1] || lines[2] !== head[2]) {
  console.error(`normalize-client-banner: unexpected ${path} header:\n` + lines.slice(0, 3).join('\n'))
  process.exit(1)
}
lines[0] = required
lines[1] = ''
lines[2] = ''
fs.writeFileSync(path, lines.join('\n'))
console.log(`normalize-client-banner ok: ${path}`)
