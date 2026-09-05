# Recon interface specification

## Design read

An operational reconciliation workbench for finance reviewers. Use the official IBM Carbon React system, a compact gray/white workspace, functional table controls and an inline evidence panel. Design variance 3, motion 1, density 8. This is product UI, not a landing page.

## Audit and preserved behavior

The previous page used a large slogan, a fixed decorative sidebar and four oversized summary blocks before its working table. The table, imports and review evidence did the actual work. Replace the marketing composition with a compact header, title, inline counts, table toolbar and a data-first split view.

Preserve all existing behavior: initial report/history fetch; loading, empty and error states; retry connection; sample load and identical replay feedback; four filters; exact decimal string display; inspect every status; review only unmatched/ambiguous entries; 10–1,000 character reasons; history with actor and timestamp; bank/ledger CSV source selection; 200 KB client limit; upload response/validation; disabled custom uploads in public sandbox; browser-only synthetic mode disclosure; local backend mode disclosure. Backend, schema, API contract, matching rules and sandbox transport are unchanged.

## Visual reference analysis

The approved generated reference depicts a black 48 px application header, a 24 px functional page title, actual-count summary text, rectangular controls and a roughly 65/35 split between ledger table and inspection. History sits below the workbench. Surface changes and fine borders provide hierarchy, with one Carbon blue action color. No shadows or decorative cards.

The implementation uses those proportions at desktop. The table fills the width until an entry is inspected. Below 1056 px, inspection moves below the table. Below 672 px, the toolbar wraps and gutters reduce to 12 px. Horizontal scrolling remains confined to data tables so identifiers and exact amounts remain readable.

Deliberate deviations from the generated image: its invented reviewer identity, avatar, navigation hamburger, account names, dates, monetary values, matching tolerance, sorting and pagination controls are omitted. Real fixture values and exact matching explanations take precedence. The synthetic/browser-state notice stays at the top. Existing source selector, CSV contract and upload control remain available. Inspection is a non-modal region: focus moves to its heading and returns to the triggering action on close.

## Foundation and components

`@carbon/react` 1.115.0 is the actual component implementation. It supports the existing React 19 version; required `react-is` and Sass peers are installed. IBM Plex Sans and Mono are self-hosted from Fontsource. Carbon Sass is imported selectively for the components used, with Carbon's font-face output disabled to avoid duplicate external fonts. Official layout, layer and zone foundations are included because component sizing relies on their CSS variables. The header uses the official g100 shell theme within the g10 workbench.

- Official Header, HeaderName, HeaderNavigation and HeaderMenuItem: application chrome and existing navigation.
- ContentSwitcher/Switch: All entries, Open, Matched, Reviewed.
- Table primitives: ledger and history, 40 px medium rows, semantic headers, no fictitious sort or selection affordances.
- Button and Carbon icons: sample replay, inspect, close, review and retry.
- Tag: real record statuses, with visible text as well as color.
- Select/SelectItem and FileUploaderButton: existing CSV workflow.
- TextArea: review reason and existing validation constraints.
- InlineNotification, InlineLoading and DataTableSkeleton: asynchronous feedback and loading.
- Theme g10: official Carbon tokens. Custom styles compose layout; component appearance is not re-created.

The interface uses Carbon background/layer/border/text/focus/highlight tokens. Primary action blue comes from Carbon (`#0f62fe`), primary ink `#161616`, gray canvas `#f4f4f4` and white layers. Heading 24/32 px, section heading 16/24 px, body/control 14/20 px, identifiers 12 px Mono. Spacing uses 4/8/12/16/20/24/32 px increments. Display numbers use tabular figures; money retains decimal-string handling.

## Sources and applicability

- [Carbon React framework](https://carbondesignsystem.com/developing/frameworks/react/): official package, component/style/icon entry points and Vite support.
- [Carbon data-table usage](https://carbondesignsystem.com/components/data-table/usage/): data-first width, matching toolbar/row density, real inline actions, semantic status and loading guidance.
- [Carbon React package](https://github.com/carbon-design-system/carbon/blob/main/packages/react/package.json): compatibility checked against published npm metadata for version 1.115.0.
- [IBM catalogue reference](https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/ibm/DESIGN.md): flat blue/gray identity and typography, not its marketing hero/CTA section structure. Official Carbon product guidance takes precedence.
- [Taste skill](https://tasteskill.dev): audit first, real design systems, intentional typography, accessible states. Its own scope excludes dense dashboards, so its marketing spacing/hero/imagery rules do not govern this application.
- [Image-to-code skill](https://github.com/Leonxlnx/taste-skill/blob/main/skills/image-to-code-skill/SKILL.md): generated reference analyzed before implementation, fidelity to the workbench composition and deliberate deviation record.
- [Vercel web-interface guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md): latest rules read for semantic controls, labels, focus, live feedback, reduced motion and mobile overflow.

## Verification and preflight

Run both `npm run build` and `VITE_DEMO_MODE=true npm run build`, then `cd backend && ./mvnw -B -ntp test`. Check the public sandbox on desktop and at 390 px: load/replay, every filter, inspect matched/open rows, record a reason, inspect history, close/focus return, and disabled custom upload explanation. Check the full local app for source selection/import and server feedback when available.

No backend changes, generated illustration assets, decorative hero, invented controls or fabricated data are part of the redesign. Official component keyboard/focus defaults are retained. The inline inspection has explicit heading focus; tables expose labelled scroll regions. Review text and long identifiers wrap within evidence/history without widening the page. Motion is limited to Carbon feedback, with a reduced-motion override.

Verified during implementation: normal and sandbox production builds passed; all 12 existing Java integration tests passed. A restricted test attempt could not attach Mockito instrumentation; the same unchanged suite passed outside that sandbox. Browser checks covered sample load, open filtering, fee review/history, matched inspection without a review action, Escape close and focus return. At 390 px the document width remained 390 px and the heading stayed 24 px. The publication audit scanned 7 historical commits and 46 distinct blobs: no real secret patterns, tracked secret files or employer references were found. Credential-like matches were documented local demo configuration and standard Maven wrapper variables.
