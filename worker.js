const REGION = "us-west-004";
const HOST = "afeon-eagler.s3.us-west-004.backblazeb2.com";
const EXPIRES_SECONDS = 300;
const FILES = Object.freeze({
  "1.8.8-JS": "1.8.8-JS.html",
  "1.8.8-WASM": "1.8.8-WASM.html",
  "1.12.2-JS": "1.12.2-JS.html",
  "1.12.2-WASM": "1.12.2-WASM.html",
  "26.2": "26.2.html",
  "26.3": "26.3.html",
});
const encoder = new TextEncoder();

function awsEncode(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function toHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hmac(keyBytes, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

function canonicalQuery(parameters) {
  return [...parameters.entries()]
    .map(([key, value]) => [awsEncode(key), awsEncode(value)])
    .sort(([keyA, valueA], [keyB, valueB]) =>
      (keyA < keyB ? -1 : keyA > keyB ? 1 : 0) ||
      (valueA < valueB ? -1 : valueA > valueB ? 1 : 0),
    )
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

async function createSignedUrl(fileName, accessKeyId, applicationKey) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${REGION}/s3/aws4_request`;
  const path = `/${awsEncode(fileName)}`;
  const parameters = new URLSearchParams([
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${accessKeyId}/${scope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", String(EXPIRES_SECONDS)],
    ["X-Amz-SignedHeaders", "host"],
  ]);
  const query = canonicalQuery(parameters);
  const canonicalRequest = [
    "GET",
    path,
    query,
    `host:${HOST}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(canonicalRequest)))),
  ].join("\n");

  const dateKey = await hmac(encoder.encode(`AWS4${applicationKey}`), dateStamp);
  const regionKey = await hmac(dateKey, REGION);
  const serviceKey = await hmac(regionKey, "s3");
  const signingKey = await hmac(serviceKey, "aws4_request");
  const signature = toHex(await hmac(signingKey, stringToSign));

  return `https://${HOST}${path}?${query}&X-Amz-Signature=${signature}`;
}

function response(message, status) {
  return new Response(message, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/tmp") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return response("Method not allowed", 405);
      }
      return env.ASSETS.fetch(new Request(new URL("/tmp.html", url), request));
    }
    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }
    if (url.pathname !== "/api/launch") {
      return response("Not found", 404);
    }
    if (request.method !== "GET") {
      return response("Method not allowed", 405);
    }

    const version = url.searchParams.get("version");
    const fileName = version && FILES[version];
    if (!fileName) {
      return response("Unknown version", 400);
    }
    if (!env.B2_KEY_ID || !env.B2_APPLICATION_KEY) {
      return response("Storage credentials are not configured", 500);
    }

    const signedUrl = await createSignedUrl(fileName, env.B2_KEY_ID, env.B2_APPLICATION_KEY);
    return new Response(null, {
      status: 302,
      headers: {
        "Cache-Control": "no-store",
        "Location": signedUrl,
        "Referrer-Policy": "no-referrer",
      },
    });
  },
};
