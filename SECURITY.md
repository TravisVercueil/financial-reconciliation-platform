# Security and deployment boundary

This is a single-operator portfolio demonstration, not a payment or accounting service. It never transfers money. The full backend intentionally has no authentication and binds to loopback by default. Do not expose it publicly or import personal/customer data. Docker ports also bind only to localhost.

The public Vercel deployment is a separate browser-only sandbox using synthetic fixtures and localStorage. It has no backend credentials or server persistence. Clearing site data removes sandbox reviews.

Before a shared production deployment, add authentication, server-derived operator identity, authorization, CSRF protection appropriate to that authentication, upload rate/body limits at the proxy, managed secrets, backups, migrations and operational monitoring. The displayed actor “Demo operator” is not a verified identity.

Report sensitive issues privately to travisvercueil@gmail.com; do not include secrets in public issues.
