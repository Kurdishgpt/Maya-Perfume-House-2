# Maya Collection on Netlify

The storefront uses the existing Express API through a Netlify Function. Structured store data now uses Netlify Database with Drizzle ORM. Product images use Netlify Blobs. The runtime no longer connects to Supabase or requires Supabase keys.

## Deploy and configure

Keep the repository root as the base directory. The existing `netlify.toml` supplies the storefront build, publish directory, function directory, API rewrites, and SPA fallback.

Configure `ADMIN_PANEL_PASSWORD` and `SESSION_SECRET` as server-only Netlify environment variables available to Functions in the context being deployed. Use a strong administrator password and a long random session signing secret. Redeploy after changing these settings. Never prefix either setting with `VITE_`.

Netlify supplies the managed database connection. Database schema exports are in `db/schema.ts`, and generated migrations are in `netlify/database/migrations/`. The platform applies these migrations during deployment; do not apply them manually. This change prepares tables for the catalog, supplier import history, carts, checkout orders, contact messages, settings, and persistent request limits.

After deployment, `/api/admin/passcode` should return HTTP 200 with `unlocked: false` before login. HTTP 503 from this endpoint indicates missing administrator configuration. HTTP 404 indicates that the function or API redirects are missing. Once logged in, use the database connection check in Settings, which calls the protected `/api/database/status` endpoint.

Admin checks load separately from catalog integrations. A database integration startup failure does not prevent the access status endpoint from loading. Login attempts use persistent database request limits and therefore require the database migrations to be available.

## Existing data

The new managed database starts with no catalog records. Existing Supabase records have not been transferred. Export the existing catalog separately and use the protected catalog CSV import in Settings to populate the new database. The CSV import does not transfer historical orders, contact messages, cart state, or uploaded image files; those require a separate transfer. The historical Supabase SQL files are not the Netlify migration source.

The API retains its existing response fields, including `supabase_id`, for compatibility with storefront carts and checkout. That field now contains the Netlify Database product UUID.

## Product images

Uploads now use authenticated API requests backed by Netlify Blobs. Supported image types are JPEG, PNG, WebP, and AVIF, up to 4 MB. Existing external image URLs remain references to their original locations; legacy Replit object paths are not transferred automatically.

## Verification

The managed database connection was verified with a read-only query. Shared library, API, and storefront typechecks passed. The deployment migrations were generated but not applied manually. Catalog writes, checkout transactions, and image uploads still require end-to-end verification after deployment.

AI description and supplier search integrations retain their existing provider configuration requirements.
