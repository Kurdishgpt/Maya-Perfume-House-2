---
name: Production hosting
description: Maya Collection’s chosen production hosting and database direction.
---

Maya Collection’s production target is Netlify, with Supabase as the production database. The legacy Replit PostgreSQL database is retained as an optional source for one-time migration, not as a runtime requirement for Netlify functions.

The user-specified canonical hostname is `mayacolllection.com`; preserve this exact spelling unless the user corrects it.

**Why:** The user explicitly moved the store to Netlify after Vercel deployment problems and asked to preserve Supabase-backed products and admin operations.

**How to apply:** For deployment and SEO work, use the specified hostname for canonical URLs until corrected. Keep Netlify Functions compatible with Supabase and avoid reintroducing an import-time dependency on `DATABASE_URL`. Do not switch back to Vercel unless the user asks.
