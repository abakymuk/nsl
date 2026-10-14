// Exercise the built route with the same CommonJS/ESM restriction that caused
// production to crash before POST ran. No real databases or notifications.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { setTimeout as delay } from "node:timers/promises";

let savedQuote;
let inserts = 0;
const backend = createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  const path = new URL(request.url, "http://localhost").pathname;
  if (path === "/rest/v1/quotes" && request.method === "GET") {
    response.end(JSON.stringify(savedQuote ? [savedQuote] : []));
  } else if (path === "/rest/v1/quotes" && request.method === "POST") {
    let body = "";
    for await (const chunk of request) body += chunk;
    savedQuote = { ...JSON.parse(body), id: "10000000-0000-4000-8000-000000000002", reference_number: "NSL-RUNTIME-TEST" };
    inserts++;
    response.statusCode = 201;
    response.end(JSON.stringify(savedQuote));
  } else if (path === "/rest/v1/rpc/claim_quote_notifications") {
    response.end("[]");
  } else if (path === "/rest/v1/quote_tokens" && request.method === "GET") {
    response.end(JSON.stringify({ token: "a".repeat(64) }));
  } else {
    response.statusCode = 500;
    response.end(JSON.stringify({ message: `Unexpected test backend request: ${request.method} ${path}` }));
  }
});

// NEXT_PUBLIC values are inlined at build time: build with this same fixture URL.
backend.listen(54321, "127.0.0.1");
await once(backend, "listening");
const port = 3217;
const baseUrl = `http://127.0.0.1:${port}`;
let output = "";
const app = spawn(process.execPath, ["--no-experimental-require-module", "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
    RESEND_API_KEY: "re_test_key",
    UPSTASH_REDIS_REST_URL: "",
    UPSTASH_REDIS_REST_TOKEN: "",
    SLACK_WEBHOOK_URL: "",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
app.stdout.on("data", (chunk) => { output += chunk; });
app.stderr.on("data", (chunk) => { output += chunk; });

try {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (app.exitCode !== null) throw new Error(`Server exited: ${app.exitCode}`);
    try {
      if ((await fetch(`${baseUrl}/api/quote`, { signal: AbortSignal.timeout(1000) })).status === 405) break;
    } catch { /* Wait until the listener is ready. */ }
    if (attempt === 59) throw new Error("Production server did not become ready");
    await delay(500);
  }
  const post = (body, key) => fetch(`${baseUrl}/api/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const invalid = await post({});
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error, "Validation failed");

  const form = { fullName: "TEST Runtime", companyName: "<b>TEST</b> Company", phone: "555-123-4567",
    port: "la", requestType: "standard", deliveryZip: "90210", notes: "<script>alert(1)</script>Local fixture only" };
  const key = "10000000-0000-4000-8000-000000000001";
  const submitted = await post(form, key);
  assert.equal(submitted.status, 200);
  const result = await submitted.json();
  assert.equal(result.success, true);
  assert.equal(result.referenceNumber, "NSL-RUNTIME-TEST");
  assert.ok(result.statusUrl.endsWith(`/quote/status/${"a".repeat(64)}`));
  assert.equal(savedQuote.company_name, "TEST Company");
  assert.equal(savedQuote.special_instructions, "Local fixture only");

  const retried = await post(form, key);
  assert.equal(retried.status, 200);
  assert.equal((await retried.json()).referenceNumber, result.referenceNumber);
  assert.equal(inserts, 1, "A retry must not create another quote");
  assert.equal((await post({ ...form, deliveryZip: "90211" }, key)).status, 409);
  console.log("Production runtime passed: validation, sanitized save, status link, retry, conflict.");
} catch (error) {
  console.error(output);
  throw error;
} finally {
  app.kill("SIGTERM");
  if (app.exitCode === null) await once(app, "exit");
  await new Promise((resolve) => backend.close(resolve));
}
