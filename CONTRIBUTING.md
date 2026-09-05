# Contributing

Use Java 21 and Node 22 or newer. Create a focused branch from main, add a regression test for changes to matching/import/review behavior, then run `npm ci`, `npm run build` and `cd backend && ./mvnw test`. Open a PR with the problem, behavior and verification evidence. Keep synthetic fixtures free of employer and customer information.

Keep one deterministic matching implementation in Java. The public sandbox uses predefined cases; do not duplicate financial logic in the browser. Avoid new services or abstractions without a demonstrated need.
