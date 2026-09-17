# Light and Dark Mode

## Scope
- Add an isolated theme helper that defaults to light, restores the saved choice, and applies the existing `.dark` design tokens.
- Add a compact light/dark control to the authenticated account menu so both admin and student users can reach it.
- Keep all application pages, data, authentication, and business behavior unchanged.

## Verification
- Confirm the selected theme survives a refresh.
- Check representative admin and student pages in both themes for readable backgrounds, cards, borders, text, and status styling.

## Technical details
- Store only the theme name in browser storage.
- Apply the theme after hydration to avoid changing server-rendered behavior.
- Reuse the existing button, menu, icons, and semantic color tokens.
