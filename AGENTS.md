<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Academic verification lock is enforced by the guard_student_academic DB trigger (students cannot edit academic fields once verified; admin edits to verified data reset to pending) — UI locks alone can be bypassed.
- Student CSV import runs client-side (parse/validate in src/lib/student-import.ts) and only inserts; existing enrollment numbers/emails are skipped, never overwritten.
- CSV/ZIP exports are built client-side via src/lib/export.ts (downloadCsv, downloadDossier) — reuse it for any new export so formatting stays consistent.
