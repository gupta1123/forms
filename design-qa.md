# Design QA

## Scope

- Source: `/Users/apple/.codex/attachments/5889feac-82e1-4c47-8edc-d61bd8abe161/pasted-text.txt`
- Implementation: corporate registration state at `/?registration=corporate`
- Compared only the three requested surfaces: registration-type selector, corporate conditions strip, and existing-registration lookup link.
- Existing page chrome, form fields, spacing system, and form actions were intentionally preserved.

## Verification

- Compared the source component markup and CSS values against the implementation for typography, spacing, borders, active/inactive states, radio indicators, colors, wrapping, and hover treatment.
- Visually inspected the implementation at the default in-app browser viewport (1280 × 720) and captured a full-page rendering.
- Verified the corporate attendee count updates the conditions strip from 2 to 21.
- Verified Individual and Corporate selections navigate to and render their respective existing forms.
- Verified “Already registered? Check your pass” opens the existing paid-registration lookup.
- Verified the page produced no browser console warnings or errors.
- `npm run lint`, `npm run build`, and `git diff --check` passed.

## Findings

- P0: 0
- P1: 0
- P2: 0
- P3: 0

## Result

Passed
