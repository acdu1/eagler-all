# eagler-all
:)

## Cloudflare Worker setup

The original page's launch handoff sends supported version selections to `/api/launch?version=...`. Deploy `worker.js` as a Cloudflare Worker and route `eag.afeonbooks.com/api/*` to it. Keep the existing page deployment serving `index.html` for `/`.

Add these as Worker secrets in the Cloudflare dashboard (Worker > Settings > Variables and Secrets), not in `index.html` or source control:

- `B2_KEY_ID`: Backblaze S3-compatible key ID.
- `B2_APPLICATION_KEY`: the matching application key/secret.

Use a Backblaze application key restricted to the `afeon-eagler` bucket with read-only access. The Worker issues five-minute signed links for the six filenames listed in `worker.js`. The bucket endpoint is `afeon-eagler.s3.us-west-004.backblazeb2.com`; the `f004.backblazeb2.com` download host is not needed for this S3-compatible setup.
