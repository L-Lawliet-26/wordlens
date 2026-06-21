# Contributing to WordLens

Thanks for considering a contribution! WordLens is a small, learning-focused project, so contributions of any size are welcome — fixing a typo, reporting a bug, or adding a feature.

## Reporting a bug

Open an [issue](../../issues) and include:
- What you expected to happen
- What actually happened
- Steps to reproduce (which website, which text you selected, etc.)
- Your browser and OS version

Screenshots help a lot — this project deals with positioning and UI, so a picture is often clearer than a description.

## Suggesting a feature

Open an issue describing:
- The problem you're trying to solve (not just the feature itself)
- Why existing features don't already cover it

## Submitting a change (pull request)

1. Fork the repository.
2. Create a branch for your change:
   ```bash
   git checkout -b feature/short-description
   ```
3. Make your changes. Keep them focused — one logical change per pull request is easier to review than several unrelated ones bundled together.
4. Test manually by loading the extension via `about:debugging` in Firefox (see README for steps) and confirming:
   - The selection popup still opens/positions correctly.
   - The settings panel still opens and all tabs work.
   - No console errors appear in the browser's developer tools.
5. Commit with a clear message describing *what* changed and *why*.
6. Push your branch and open a pull request against `main`.

## Code style

- Plain JavaScript, HTML, CSS — no build step, no framework. Please keep it that way unless discussed first in an issue.
- Match the existing naming convention (`stt` prefix for variables/IDs/classes in this codebase) so the code stays consistent.
- Add a short comment above any non-obvious logic, especially anything involving coordinate math (scroll offsets, viewport positioning) since that's the trickiest part of this codebase.

## Questions

If anything here is unclear, open a discussion or issue — no question is too small.
