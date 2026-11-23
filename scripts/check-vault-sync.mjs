// Fails verify when the vault handoff note (projects/<name>/STATUS.md in the
// second-brain vault) is behind this repo's work. Strict by design: see
// vault knowledge/project-record-keeping.md.
//  - dirty tree: STATUS.md must be edited after the newest changed file, and its
//    `updated:` date must be today
//  - clean tree: STATUS.md `updated:` date must not be older than the last commit
// If the vault is not on this machine the check is skipped with a notice.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const vault = process.env.SECOND_BRAIN || join(homedir(), 'Documents/SecondBrain');
if (!existsSync(vault)) {
  console.log('skip: vault not found at ' + vault);
  process.exit(0);
}
const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).trim();
const root = realpathSync(git('rev-parse', '--show-toplevel'));

let dir = null;
for (const base of [join(vault, 'projects'), join(vault, 'projects/paused')]) {
  if (!existsSync(base)) continue;
  for (const name of readdirSync(base)) {
    const readme = join(base, name, 'README.md');
    if (!existsSync(readme)) continue;
    const m = readFileSync(readme, 'utf8').match(/^local_path:\s*(.+)$/m);
    if (!m) continue;
    const p = m[1].trim().replace(/^["']|["']$/g, '').replace(/^~/, homedir());
    try { if (realpathSync(p) === root) dir = join(base, name); } catch { /* path missing */ }
  }
}
const fail = (msg) => { console.error('check-vault-sync failed: ' + msg); process.exit(1); };
if (!dir) fail('no vault project has local_path = ' + root + ' (create projects/<name>/README.md in the vault)');
const status = join(dir, 'STATUS.md');
if (!existsSync(status)) fail(status + ' is missing');

const today = new Date().toLocaleDateString('sv-SE');
const updated = (readFileSync(status, 'utf8').match(/^updated:\s*(\d{4}-\d{2}-\d{2})/m) || [])[1];
if (!updated) fail('STATUS.md has no "updated: YYYY-MM-DD" frontmatter');

const dirty = git('status', '--porcelain', '-uall').split('\n').filter(Boolean)
  .map((l) => l.slice(3).replace(/^.* -> /, '').replace(/^"|"$/g, ''));
if (dirty.length) {
  const newest = Math.max(...dirty.map((f) => { try { return statSync(f).mtimeMs; } catch { return 0; } }));
  if (statSync(status).mtimeMs < newest) fail('code changed after STATUS.md was last edited. Rewrite ' + status + ' (state, done, next, blockers), then rerun verify');
  if (updated !== today) fail('STATUS.md says updated: ' + updated + ' but there are changes today (' + today + '). Update it');
} else {
  const last = git('log', '-1', '--format=%cs');
  if (last && updated < last) fail('STATUS.md (updated ' + updated + ') is older than the last commit (' + last + '). Rewrite ' + status);
}
console.log('ok: vault STATUS.md is current (' + updated + ')');
