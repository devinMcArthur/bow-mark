# Spec: Install @typescript-eslint/eslint-plugin + re-enable lint in builds

**Status:** Ready to implement  
**Context:** During the PR #146 deploy push, `next build` failed because `.eslintrc.json`
references `@typescript-eslint/no-explicit-any` and `@typescript-eslint/ban-ts-comment`
rules whose plugin (`@typescript-eslint/eslint-plugin`) was never installed — only the
parser was. Workaround was `eslint.ignoreDuringBuilds: true` in `next.config.js` and
disabling the rules in `.eslintrc.json`. This spec removes the workaround properly.

**Files to change:**
- `client/package.json` — add devDependency
- `client/.eslintrc.json` — restore proper config
- `client/next.config.js` — re-enable lint during builds

---

## Step 1 — Install the plugin

```bash
cd client && npm install --save-dev @typescript-eslint/eslint-plugin@^5
```

Pin to `^5` to match the existing `@typescript-eslint/parser@4.33.0` major version
(eslint-config-next@12 ships parser 4.x; the plugin should be on the same major).

---

## Step 2 — Restore `.eslintrc.json`

Remove the three disabled rules we added as workarounds. The file should go back to:

```json
{
  "extends": ["next/core-web-vitals", "prettier"]
}
```

The `@typescript-eslint/*` rules are provided by the plugin via `next/core-web-vitals`
— once the plugin is installed they resolve automatically. No need to configure them
explicitly unless we want to change severity.

---

## Step 3 — Re-enable lint during builds in `next.config.js`

Remove the `eslint` block entirely (or set `ignoreDuringBuilds: false`):

```js
module.exports = withPWA({
  // next.js config
  // reactStrictMode: true,
});
```

---

## Step 4 — Fix real violations

After installing the plugin, `npm run lint` will surface any actual violations the
rules now enforce. Common ones to expect:

- `@typescript-eslint/no-explicit-any` — replace `any` with proper types, or add
  `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with a comment
  explaining why. Don't blanket-disable; fix where easy, disable with justification
  where genuinely necessary (e.g. Mongoose document casting).
- `@typescript-eslint/ban-ts-comment` — `@ts-ignore` should become `@ts-expect-error`
  with a description. Remove if unnecessary.
- `react/no-unescaped-entities` — replace `'` with `&apos;` and `"` with `&quot;`
  in JSX text content.

**Guideline:** Fix violations properly where the fix is <5 lines. Use targeted
`eslint-disable-next-line` with an explanatory comment where fixing would require
a larger refactor. Never add a file-level `eslint-disable`.

---

## Step 5 — Verify

```bash
cd client
npm run lint          # must exit 0, warnings ok, no errors
npm run type-check    # must exit 0
NODE_OPTIONS=--openssl-legacy-provider npm run build  # must compile clean
```

---

## Definition of done

- `npm run lint` exits 0 (warnings acceptable, errors not)
- `next build` completes without ESLint errors
- No blanket file-level `eslint-disable` comments added
- `eslint.ignoreDuringBuilds` removed from `next.config.js`
- Commit message: `fix(client): install @typescript-eslint/eslint-plugin, fix lint violations`
