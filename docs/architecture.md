# Architecture notes

The dependency direction is app → core/layouts/shared/features. Shared, core and layout layers remain feature agnostic. Each feature owns its own page, schemas, API service, hooks and tests as needed. Cross-cutting API transport and error normalization live in core; React Query owns remote cache state. Auth is represented by interfaces and must be backed by a real identity system before production use. UI permission checks do not replace server authorization.
