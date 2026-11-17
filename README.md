## Deploy to Cloudflare

The site stays as HTML. `worker.js` makes this a code Worker that serves the built page and signs private Backblaze download links. `/tmp` serves the Eaglercraft 1.8.8 WebAssembly client. `wrangler.jsonc` routes `eag.afeonbooks.com/*` through this Worker, with `/api/*` and `/tmp` handled by code. This avoids deploying an assets-only Worker.

The build command must run before `wrangler deploy`, because it creates the `dist` folder referenced in `wrangler.jsonc`. For Cloudflare Workers Builds, set:

- **Build command:** `npm run build`
- **Deploy command:** `npx wrangler deploy`

Alternatively, make the Cloudflare **Deploy command** `npm run deploy`, which runs both steps.

For a local deployment, run:

```sh
npm install
npx wrangler login
npm run deploy
npx wrangler secret put B2_KEY_ID
npx wrangler secret put B2_APPLICATION_KEY
```

Wrangler prompts for each secret; enter the Backblaze S3 key ID and application key there. Do not put secret values in `index.html`, `worker.js`, or source control. Use a Backblaze key restricted to the `afeon-eagler` bucket with read-only access.

The Worker signs five-minute links for the six filenames listed in `worker.js`. Its S3 endpoint is `afeon-eagler.s3.us-west-004.backblazeb2.com`. If Cloudflare Access protects the site, add a Bypass policy for `/api/*` so the launch button can reach the Worker.
