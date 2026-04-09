---
name: releasing-clickup-cli
description: Publishes a new version of clickup-cli to npm, updates Homebrew tap, writes release notes, and syncs the agent skill. Use when releasing a new version, bumping version, or verifying a release.
metadata:
  internal: true
---

## Versioning

| Change type                      | Bump          |
| -------------------------------- | ------------- |
| Bug fix                          | patch (x.y.Z) |
| New feature, backward compatible | minor (x.Y.0) |
| Breaking change                  | major (X.0.0) |

## Pre-release checklist

- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm test` passes (includes version sync test)
- [ ] `npm run build` succeeds
- [ ] New commands added to `src/commands/metadata.ts` (completion test will fail otherwise)

## Release steps

### 1. Commit feature/fix changes first

Do NOT mix feature commits with version bump commits.

### 2. Bump version

```bash
npm version <version> --no-git-tag-version
```

### 3. Sync all version-tracked files

```bash
node --import tsx scripts/sync-command-docs.ts
```

This updates:

- `docs/commands.md` quick reference table
- `skills/clickup-cli/SKILL.md` version header (line 6)
- `skills/clickup-cli/SKILL.md` version check hint (line 10)
- `.claude-plugin/plugin.json` version field

The `version synchronization` test in `tests/unit/` verifies these stay in sync.

### 4. Commit and tag

```bash
git add package.json package-lock.json .claude-plugin/plugin.json docs/commands.md skills/clickup-cli/SKILL.md
git commit -m "bump v<version>"
git tag v<version>
git push origin main --tags
```

### 5. Wait for CI

```bash
gh run watch --repo krodak/clickup-cli --exit-status $(gh run list --repo krodak/clickup-cli --workflow release.yml --limit 1 --json databaseId -q '.[0].databaseId')
```

The release workflow runs: typecheck, test, build, npm publish (OIDC), GitHub Release creation.

### 6. If CI fails

Common failures:

- **`npm ci` fails**: peer dep conflict (typescript-eslint vs TypeScript 6). `.npmrc` has `legacy-peer-deps=true`.
- **Completion test fails**: `metadata.ts` is missing a new command or flag. Add it, amend, re-tag, force push.
- **npm publish fails "already published"**: Version already exists on npm from a previous attempt. Bump to next version.

Fix, then:

```bash
git commit --amend --no-edit   # or new commit
git tag -d v<version>
git tag v<version>
git push origin main --tags --force
```

### 7. Write release notes

```bash
gh release edit v<version> --repo krodak/clickup-cli --notes "$(cat <<'EOF'
## Heading

Description and code examples.

Test count.
EOF
)"
```

Style: H2 per feature, code block with 2-3 examples, test count at bottom, no emojis.

### 8. Update Homebrew

```bash
SHA=$(curl -sL https://registry.npmjs.org/@krodak/clickup-cli/-/clickup-cli-<version>.tgz | shasum -a 256 | cut -d' ' -f1)
```

Then update `~/repositories/homebrew-tap/Formula/clickup-cli.rb`:

- Change version in URL
- Change sha256

```bash
git -C ~/repositories/homebrew-tap add Formula/clickup-cli.rb
git -C ~/repositories/homebrew-tap commit -m "clickup-cli <version>"
git -C ~/repositories/homebrew-tap push origin main
```

### 9. Install updated skill

```bash
cp skills/clickup-cli/SKILL.md ~/.config/opencode/skills/clickup/SKILL.md
```

## Common mistakes to avoid

- Running `git commit` before `node --import tsx scripts/sync-command-docs.ts` (use the script to sync everything)
- Not adding new commands to `src/commands/metadata.ts`
- Bumping version in the same commit as feature changes
- Force-pushing tags without deleting old tag first
