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

- Keep application validation in the shared permohonan schema so the form and rule tests agree.
- Keep industry and emergency-relationship options in the shared application schema and mirror their allowlists in submission SQL so stored values match the form.
- Version submission RPC changes in database-update SQL alongside client types so existing installations can upgrade safely.

- Keep date and timestamp display formatting centralized in src/lib/format.ts so all application screens use the same timezone.
- Retain legacy requested-amount database fields for compatibility, but do not use them to prefill administrator credit decisions.
