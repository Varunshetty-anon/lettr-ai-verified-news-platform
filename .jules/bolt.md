## 2024-05-24 - Batching independent Mongoose Lookups
**Learning:** Sequential database lookups significantly slow down critical API paths like the main feed. Replacing these with `Promise.all` batching reduces N round trips to 1, yielding substantial latency reductions.
**Action:** When gathering unrelated hydration data (e.g., users, liked items, viewed items), always execute the queries in parallel using `Promise.all`.
