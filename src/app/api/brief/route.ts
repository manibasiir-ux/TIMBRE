import {
  clientIp,
  createRateLimiter,
  emailTransport,
  slackTransport,
  turnstileVerifier,
} from "@/lib/brief/delivery";
import { generateReferenceCode } from "@/lib/brief/referenceCode";
import { briefSchema } from "@/lib/brief/schema";

/**
 * Brief submission, FR-17 and FR-18.
 *
 * Order matters here, and it is cheapest-first on purpose: rate limit before
 * parsing, honeypot before the network call to Turnstile, verification before
 * delivery. A flood of junk should cost a map lookup, not an outbound request.
 *
 * The honeypot is answered with the same 200 and a plausible reference code a
 * real submission gets. Telling a bot it was detected is free information for
 * whoever wrote it; letting it believe it succeeded is not.
 */

// Upstash when configured, in-memory otherwise. On serverless the in-memory
// limiter is effectively no limiter at all — every cold start gets an empty map.
const limiter = createRateLimiter();

export async function POST(request: Request) {
  const ip = clientIp(request.headers);

  const limit = await limiter.check(ip);
  if (!limit.allowed) {
    return Response.json(
      { error: "rate_limited", message: "Too many submissions. Try later." },
      { status: 429, headers: { "retry-after": "600" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = briefSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "invalid_payload",
        // Field-keyed so the client can put each message beside its input
        // rather than dumping one banner at the top of the form.
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const payload = parsed.data;

  if (payload.fax) {
    return Response.json({ ok: true, reference: generateReferenceCode() });
  }

  const verified = await turnstileVerifier.verify(payload.turnstileToken);
  if (!verified) {
    return Response.json({ error: "verification_failed" }, { status: 400 });
  }

  const reference = generateReferenceCode();

  // Email is the delivery that matters; Slack is a notification. A Slack
  // outage must not fail a submission the studio has already received, so the
  // two are settled together and only the email result can fail the request.
  const [email, slack] = await Promise.all([
    emailTransport.send(reference, payload),
    slackTransport.send(reference, payload),
  ]);

  if (!email.ok) {
    return Response.json(
      { error: "delivery_failed", message: email.detail },
      { status: 502 },
    );
  }

  if (!slack.ok) {
    console.warn(`[brief] ${reference} delivered, Slack failed: ${slack.detail}`);
  }

  return Response.json({ ok: true, reference });
}
