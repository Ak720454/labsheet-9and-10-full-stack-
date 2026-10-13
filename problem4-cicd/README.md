# Problem 4: Git and CI/CD

## (a) Workflow

The workflow lives at the repository root so GitHub can find it: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

- Triggers: pull requests to `main` and pushes to `main`
- `lint` job first; `test` job `needs: lint`
- Test matrix: Node 18 and Node 20, with npm dependency caching (`actions/setup-node` with `cache: npm`)
- `deploy` job `needs: test` and has `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`, so it never runs for pull requests and only runs if all test jobs passed

Note: `npm ci` and the npm cache need `problem1-task-api/package-lock.json`. Run `npm install` once in that folder and commit the lock file.

## (b) A teammate force-pushed to `main` and 3 commits vanished

1. Find the old tip of `main` (the commit before the force-push):

   ```bash
   git fetch origin
   git reflog show origin/main        # the entry just before the force-push is the old tip
   # or, on any teammate's clone that still has the commits:
   git reflog
   git log --oneline origin/main@{1}  # confirm: the 3 missing commits should be listed
   ```

   If nobody has a local copy, the GitHub repo's **Activity** page (or the push event in the API) shows the force-push with its "before" SHA.

2. Create a branch at that commit so the commits can no longer be garbage-collected:

   ```bash
   git branch recovery <old-tip-sha>
   git push origin recovery            # back it up on the remote straight away
   ```

3. Bring in whatever was legitimately pushed after the force-push, then restore `main`:

   ```bash
   git checkout recovery
   git merge origin/main               # or: git rebase origin/main
   # Normal case: open a PR  recovery -> main  (no force needed).
   # If main must be reset to the recovered history, coordinate with the team first, then:
   git push --force-with-lease=main:<current-main-sha> origin recovery:main
   ```

   `--force-with-lease` refuses to overwrite `main` if somebody pushed in the meantime.

**Prevention:** enable **branch protection on `main`** (GitHub: Settings > Branches > rule for `main`): block force pushes and deletions, and require pull requests (with reviews and passing CI) before merging.
