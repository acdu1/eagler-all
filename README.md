## Cloudflare Worker setup

`index.html` is a self-contained version picker with inline styles and a JS/WASM build selector for classic releases. Launching a game sends the selected version to `/api/launch?version=...`. Deploy `worker.js` as a Cloudflare Worker and route `eag.afeonbooks.com/api/*` to it. The static site can serve `index.html` on its own; no external assets are needed.

Add these as Worker secrets in the Cloudflare dashboard (Worker > Settings > Variables and Secrets), not in `index.html` or source control:

- `B2_KEY_ID`: Backblaze S3-compatible key ID.
- `B2_APPLICATION_KEY`: the matching application key/secret.

Use a Backblaze application key restricted to the `afeon-eagler` bucket with read-only access. The Worker issues five-minute signed links for the six filenames listed in `worker.js`. The bucket endpoint is `afeon-eagler.s3.us-west-004.backblazeb2.com`; the `f004.backblazeb2.com` download host is not needed for this S3-compatible setup. :)
