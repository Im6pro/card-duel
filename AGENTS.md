# King Slayer project instructions

## Version label (explicit owner preference)
- Show the same small white bottom-right version credit on both the name-entry lobby and the gameplay screen.
- Exact format: `Update 0.N By M.AlNajm`. Preserve `By M.AlNajm` exactly.
- The single source of truth is `#release-label` in `index.html`, with integer `data-update`.
- For every new user-requested game update, automatically increment that integer by one before publishing. Run `node scripts/bump-update.cjs` from the repository root.
- Increment once for the whole requested update, not once per edited file, intermediate fix, commit, deployment retry, or server restart.
- Do not derive this version from the total Git commit count, and do not use floating-point addition. After 0.64 comes 0.65; after 0.99 comes 0.100.
- Honor any explicitly requested version override. Do not bump merely for inspection, testing, or a status question.
- Keep the label on both screens by retaining it outside the hidden lobby/game containers.

## Verification and publishing
- Preserve game rules unless the user explicitly requests a change.
- Check changes at the appropriate level and verify the intended commit is live before claiming publication.
