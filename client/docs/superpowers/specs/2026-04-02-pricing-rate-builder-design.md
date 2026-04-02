# Pricing / Rate Builder Design

## Goal

Graduate the Rate Builder canvas from the developer prototype area into a first-class, org-accessible feature with a dedicated list page and full-screen canvas editor.

## Routing

| Route | Description |
|---|---|
| `/pricing` | Template list page |
| `/pricing/rate-builder/[id]` | Full-page canvas editor |

A "Rate Builder" link/button is added to the `/tenders` page as the primary entry point for PM and Admin users.

## Access Control

Accessible to **ProjectManager**, **Admin**, and **Developer** roles (weight ≥ 2 per `hasPermission`). Pages use `useAuth` + `hasPermission(user.role, UserRoles.ProjectManager)` — the existing pattern. Users below that threshold are redirected to `/`.

## `/pricing` — Template List Page

Standard app layout (navbar + `Container`).

**Page header:** "Rate Builder" title (left), teal "+ New Template" button (right).

**Template list:** One row per template, each showing:
- 3px teal left accent bar
- Template name (bold)
- Node count metadata: `N params · N tables · N formulas · Modified X ago`

Clicking a row navigates to `/pricing/rate-builder/[id]`.

**New Template flow:** Clicking "+ New Template" creates a blank `CanvasDocument` with a generated name (`"Untitled Template"`), persists it, and immediately navigates to `/pricing/rate-builder/[id]` — no modal. The user renames inline once in the editor.

Templates are **org-wide shared** — all PM/Admin/Developer users see all templates.

## `/pricing/rate-builder/[id]` — Canvas Editor

**Navbar** stays at top (unchanged, `3.4rem` height).

**Template header bar** (`~36px`, `background: #1e293b`, below navbar):
- `← Pricing` back link (navigates to `/pricing`)
- Divider
- **Inline-editable template name** — renders as text, click to edit, blur to save. Uses the existing `CanvasDocument` rename pattern already implemented in `canvasStorage`.
- Save status badge (`SAVED` / `SAVING…` in teal, right-aligned)
- `Fork` button — duplicates the template with name `"Copy of [name]"`, saves it, navigates to the new template
- `Delete` button — shows a confirmation prompt before deleting; on confirm, deletes and navigates back to `/pricing`

**Canvas area:** `CalculatorCanvas` component, `height: calc(100vh - 3.4rem - 36px)`, filling the remaining viewport exactly. The existing `canvasHeight` prop accepts this value.

## Developer Page Cleanup

The "Canvas" tab is removed from `/developer`. The `CalculatorCanvas` component is unchanged — just reused from the new route. The remaining developer tabs (Ratings Review, Calculator Templates) stay as-is.

## Files to Create / Modify

**Create:**
- `client/src/pages/pricing/index.tsx` — list page
- `client/src/pages/pricing/rate-builder/[id].tsx` — canvas editor page

**Modify:**
- `client/src/pages/developer/index.tsx` — remove Canvas tab import + panel
- `client/src/pages/tenders/index.tsx` (or wherever the tenders list lives) — add Rate Builder link

## Out of Scope

- The `/pricing` hub being used for anything other than Rate Builder templates (no other pricing tools yet)
- Per-user template ownership or private templates
- Template versioning or history
- Sharing templates with specific users
