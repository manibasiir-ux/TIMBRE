"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { audioEngine } from "@/lib/audio/AudioEngine";
import { CONFIRM_MNEMONIC } from "@/lib/audio/manifest";
import {
  BUDGET_BANDS,
  type BriefPayload,
  MAX_UPLOAD_BYTES,
  SERVICE_LINES,
  STEPS,
  briefSchema,
  validateUpload,
} from "@/lib/brief/schema";
import { clearDraft, readDraft, writeDraft } from "@/lib/brief/storage";
import { useExperience } from "@/store/useExperience";

/**
 * The brief form, specification §6.8 and FR-15 through FR-18.
 *
 * Four steps, each gated by its own slice of the shared schema, with the draft
 * written to storage on every change so a reload does not cost the answers.
 *
 * Every label is a real, permanently visible label. §10 forbids placeholder-only
 * labelling, and the floating effect is done by moving the label rather than by
 * removing it — so the field still has an accessible name when it is filled.
 */

type Values = Partial<BriefPayload>;
type Errors = Partial<Record<string, string>>;

const FIELD_CLASS =
  "peer w-full border-0 border-b border-ink-15 bg-transparent pt-6 pb-2 text-body text-ink outline-none transition-[border-color,border-width] duration-[var(--dur-quick)] focus:border-b-2 focus:border-signal placeholder:text-transparent";

const LABEL_CLASS =
  "pointer-events-none absolute left-0 top-6 origin-left font-mono text-mono-xs text-ink-70 transition-transform duration-[var(--dur-quick)] ease-[var(--ease-fader)] peer-focus:-translate-y-[18px] peer-focus:scale-75 peer-focus:text-signal peer-[:not(:placeholder-shown)]:-translate-y-[18px] peer-[:not(:placeholder-shown)]:scale-75";

function Field({
  id,
  label,
  value,
  error,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (next: string) => void;
  type?: string;
}) {
  return (
    <div className="relative">
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        placeholder={label}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={FIELD_CLASS}
      />
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      {error && (
        <p id={`${id}-error`} className="mt-2 font-mono text-mono-xs text-peak">
          {error}
        </p>
      )}
    </div>
  );
}

export function BriefForm() {
  // Seeded straight from the stored draft rather than synced in afterwards.
  // Reading it from an effect would render an empty form first and the restored
  // one a frame later, which flashes the visitor's own answers into existence.
  //
  // Safe as a lazy initialiser only because this component is mounted with
  // ssr: false — otherwise the server would render empty and the client would
  // render the draft, and the two would disagree at hydration.
  // useState, not useRef: this is read during render to seed the fields and to
  // decide whether to say the draft was restored. A ref is for values render
  // does not depend on, and reading one here would be lying about that.
  const [initial] = useState(readDraft);

  const [step, setStep] = useState(() =>
    initial ? Math.min(initial.step, STEPS.length - 1) : 0,
  );
  // Every text field starts as an empty string, never undefined. Two reasons:
  // React warns when an input flips from uncontrolled to controlled, and zod
  // fails an absent field on its type check before it ever reaches the length
  // rule — so the visitor gets "Invalid input" where the schema has a written
  // message waiting for them.
  const [values, setValues] = useState<Values>(() => ({
    name: "",
    company: "",
    role: "",
    email: "",
    services: [],
    moment: "",
    targetDate: "",
    attachmentName: "",
    fax: "",
    ...(initial?.values ?? {}),
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const restored = initial !== null;

  const consent = useExperience((state) => state.consent);
  const headingRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (reference) return;
    writeDraft(values, step);
  }, [values, step, reference]);

  const update = useCallback((patch: Values) => {
    setValues((current) => ({ ...current, ...patch }));
  }, []);

  const set = (key: keyof BriefPayload) => (next: string) => {
    update({ [key]: next } as Values);
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const rejectStep = () => {
    setShake(true);
    window.setTimeout(() => setShake(false), 320);
  };

  const advance = () => {
    const schema = STEPS[step].schema;
    if (schema) {
      const result = schema.safeParse(values);
      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors;
        setErrors(
          Object.fromEntries(
            Object.entries(fieldErrors).map(([key, list]) => [key, list?.[0]]),
          ),
        );
        rejectStep();
        return;
      }
    }
    setErrors({});
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  // §10: a route-like change of content moves focus and announces itself,
  // otherwise a screen reader user is left on a button that no longer relates
  // to what is on screen.
  useEffect(() => {
    if (step > 0) headingRef.current?.focus();
  }, [step]);

  const toggleService = (line: (typeof SERVICE_LINES)[number]) => {
    const current = values.services ?? [];
    update({
      services: current.includes(line)
        ? current.filter((item) => item !== line)
        : [...current, line],
    });
    setErrors((prev) => ({ ...prev, services: undefined }));
  };

  const onFile = (file: File | undefined) => {
    if (!file) {
      update({ attachmentName: "" });
      setUploadError(null);
      return;
    }
    const problem = validateUpload(file);
    if (problem) {
      setUploadError(problem);
      update({ attachmentName: "" });
      return;
    }
    setUploadError(null);
    update({ attachmentName: file.name });
  };

  const submit = async () => {
    const result = briefSchema.safeParse(values);
    if (!result.success) {
      rejectStep();
      setSubmitError("Something above is incomplete.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(result.data),
      });
      const body = (await response.json()) as {
        ok?: boolean;
        reference?: string;
        message?: string;
      };

      if (!response.ok || !body.ok || !body.reference) {
        // Edge case E7: the draft is deliberately kept so a retry costs
        // nothing, and there is a route out that does not need this endpoint.
        setSubmitError(
          body.message ?? "That did not send. Your answers are still here.",
        );
        return;
      }

      setReference(body.reference);
      clearDraft();

      // §6.8: the transport plays the confirmation mnemonic on success.
      if (consent === "granted") {
        const buffer = await audioEngine.load(
          CONFIRM_MNEMONIC.id,
          CONFIRM_MNEMONIC.url,
        );
        if (buffer) audioEngine.play(CONFIRM_MNEMONIC.id, { bus: "sfx" });
      }
    } catch {
      setSubmitError("That did not send. Your answers are still here.");
    } finally {
      setSubmitting(false);
    }
  };

  if (reference) {
    return (
      <section className="shell section-rhythm">
        <p className="font-mono text-mono-xs text-ok">Brief received</p>
        <p className="mt-8 font-mono text-h1 text-ink tabular-nums">
          {reference}
        </p>
        <p className="mt-8 max-w-[52ch] text-lead text-ink-70">
          Quote that code if you get in touch before we do. A person reads every
          brief, and you will hear back within two working days.
        </p>
      </section>
    );
  }

  const current = STEPS[step];

  return (
    <section className="shell section-rhythm">
      <div className="flex items-baseline justify-between gap-6">
        <p
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-h2 text-ink outline-none"
        >
          {current.title}
        </p>
        <p className="font-mono text-mono-xs text-ink-70 tabular-nums">
          Step {String(step + 1).padStart(2, "0")} /{" "}
          {String(STEPS.length).padStart(2, "0")}
        </p>
      </div>

      <div className="mt-4 flex gap-1" aria-hidden="true">
        {STEPS.map((entry, index) => (
          <span
            key={entry.id}
            className={`h-0.5 flex-1 transition-colors duration-[var(--dur-base)] ${
              index <= step ? "bg-signal" : "bg-ink-15"
            }`}
          />
        ))}
      </div>

      {restored && step === 0 && (
        <p className="mt-6 font-mono text-mono-xs text-ink-70">
          We kept what you had already written.
        </p>
      )}

      <div
        className={`mt-12 max-w-[42rem] ${shake ? "animate-[shake_0.3s_var(--ease-transport)]" : ""}`}
      >
        {step === 0 && (
          <div className="flex flex-col gap-10">
            <Field id="name" label="Your name" value={values.name ?? ""} error={errors.name} onChange={set("name")} />
            <Field id="company" label="Company" value={values.company ?? ""} error={errors.company} onChange={set("company")} />
            <Field id="role" label="Role (optional)" value={values.role ?? ""} error={errors.role} onChange={set("role")} />
            <Field id="email" label="Email" type="email" value={values.email ?? ""} error={errors.email} onChange={set("email")} />
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-12">
            <fieldset>
              <legend className="font-mono text-mono-xs text-ink-70">
                What do you need?
              </legend>
              <ul className="mt-6 flex flex-wrap gap-2">
                {SERVICE_LINES.map((line) => {
                  const selected = (values.services ?? []).includes(line);
                  return (
                    <li key={line}>
                      <button
                        type="button"
                        onClick={() => toggleService(line)}
                        aria-pressed={selected}
                        className={`min-h-11 border px-4 py-2 font-mono text-mono-xs transition-colors duration-[var(--dur-quick)] ${
                          selected
                            ? "border-signal bg-signal text-ground"
                            : "border-ink-15 text-ink-70 hover:border-ink-40"
                        }`}
                      >
                        {line}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {errors.services && (
                <p className="mt-3 font-mono text-mono-xs text-peak">
                  {errors.services}
                </p>
              )}
            </fieldset>

            <div className="relative">
              <textarea
                id="moment"
                name="moment"
                rows={4}
                maxLength={280}
                value={values.moment ?? ""}
                placeholder="What is the moment?"
                onChange={(event) => set("moment")(event.target.value)}
                aria-invalid={errors.moment ? true : undefined}
                aria-describedby={errors.moment ? "moment-error" : "moment-hint"}
                className={FIELD_CLASS}
              />
              <label htmlFor="moment" className={LABEL_CLASS}>
                What is the moment?
              </label>
              <p id="moment-hint" className="mt-2 font-mono text-mono-xs text-ink-70 tabular-nums">
                {(values.moment ?? "").length} / 280
              </p>
              {errors.moment && (
                <p id="moment-error" className="mt-2 font-mono text-mono-xs text-peak">
                  {errors.moment}
                </p>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-12">
            <fieldset>
              <legend className="font-mono text-mono-xs text-ink-70">
                Budget band
              </legend>
              {/* §6.8: laid out as faders, a signal fill rising from the base. */}
              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-5">
                {BUDGET_BANDS.map((band) => {
                  const selected = values.budget === band.value;
                  return (
                    // The input is sr-only, so it is the label that has to show
                    // focus. Without this the focusable element is a clipped
                    // 1px box and a keyboard user cannot see which band they
                    // are on — SC 2.4.7, and not something axe can detect.
                    <label
                      key={band.value}
                      className={`relative flex min-h-32 cursor-pointer flex-col justify-end overflow-hidden border p-4 transition-colors duration-[var(--dur-quick)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-signal ${
                        selected ? "border-signal" : "border-ink-15 hover:border-ink-40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="budget"
                        value={band.value}
                        checked={selected}
                        onChange={() => {
                          update({ budget: band.value });
                          setErrors((prev) => ({ ...prev, budget: undefined }));
                        }}
                        className="sr-only"
                      />
                      <span
                        aria-hidden="true"
                        className={`absolute inset-x-0 bottom-0 bg-signal transition-[height] duration-[var(--dur-base)] ease-[var(--ease-fader)] ${
                          selected ? "h-2" : "h-0"
                        }`}
                      />
                      <span
                        className={`relative font-mono text-mono-xs ${selected ? "text-signal" : "text-ink-70"}`}
                      >
                        {band.label}
                      </span>
                    </label>
                  );
                })}
              </div>
              {errors.budget && (
                <p className="mt-3 font-mono text-mono-xs text-peak">
                  {errors.budget}
                </p>
              )}
            </fieldset>

            <Field
              id="targetDate"
              label="Target date (optional)"
              value={values.targetDate ?? ""}
              error={errors.targetDate}
              onChange={set("targetDate")}
            />

            <div>
              <label
                htmlFor="attachment"
                className="block font-mono text-mono-xs text-ink-70"
              >
                Attachment (optional, PDF or ZIP, 25 MB max)
              </label>
              <input
                id="attachment"
                type="file"
                accept="application/pdf,application/zip"
                onChange={(event) => onFile(event.target.files?.[0])}
                aria-describedby={uploadError ? "attachment-error" : undefined}
                className="mt-3 block w-full font-mono text-mono-xs text-ink-70 file:mr-4 file:min-h-11 file:border file:border-ink-15 file:bg-transparent file:px-4 file:py-2 file:font-mono file:text-mono-xs file:text-ink"
              />
              {uploadError && (
                <p id="attachment-error" className="mt-2 font-mono text-mono-xs text-peak">
                  {uploadError}
                </p>
              )}
              {values.attachmentName && !uploadError && (
                <p className="mt-2 font-mono text-mono-xs text-ok">
                  {values.attachmentName} — attached on send
                </p>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <dl className="flex flex-col gap-6 border-t border-ink-15 pt-8">
            {[
              ["Name", values.name],
              ["Company", values.company],
              ["Role", values.role || "—"],
              ["Email", values.email],
              ["Needs", (values.services ?? []).join(", ")],
              ["The moment", values.moment],
              ["Budget", BUDGET_BANDS.find((b) => b.value === values.budget)?.label],
              ["Target date", values.targetDate || "—"],
              ["Attachment", values.attachmentName || "—"],
            ].map(([label, value]) => (
              <div key={String(label)} className="grid grid-cols-3 gap-4">
                <dt className="font-mono text-mono-xs text-ink-70">{label}</dt>
                <dd className="col-span-2 text-body text-ink">{value || "—"}</dd>
              </div>
            ))}
          </dl>
        )}

        {/* FR-17 honeypot. Hidden from everyone who is not a form filler. */}
        <div aria-hidden="true" className="absolute left-[-9999px] h-0 overflow-hidden">
          <label htmlFor="fax">Fax</label>
          <input
            id="fax"
            name="fax"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={values.fax ?? ""}
            onChange={(event) => update({ fax: event.target.value })}
          />
        </div>
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-4">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((c) => Math.max(0, c - 1))}
            className="min-h-11 border border-ink-15 px-6 py-3 font-mono text-mono-xs text-ink hover:border-ink-40"
          >
            Back
          </button>
        )}

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={advance}
            className="min-h-11 bg-signal px-8 py-3 font-mono text-mono text-ground"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="min-h-11 bg-signal px-8 py-3 font-mono text-mono text-ground disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Send brief"}
          </button>
        )}
      </div>

      <p aria-live="assertive" className="mt-6 min-h-6 font-mono text-mono-xs text-peak">
        {submitError}
      </p>

      {submitError && (
        <p className="max-w-[52ch] text-small text-ink-70">
          Or email{" "}
          <a href="mailto:new@timbre.studio" className="text-signal underline underline-offset-4">
            new@timbre.studio
          </a>{" "}
          directly. Nothing you have typed has been lost.
        </p>
      )}

      <noscript>
        <p className="mt-8 max-w-[52ch] text-body text-ink-70">
          This form needs JavaScript. Email{" "}
          <a href="mailto:new@timbre.studio" className="text-signal underline">
            new@timbre.studio
          </a>{" "}
          and you will reach exactly the same people.
        </p>
      </noscript>

      <p className="mt-8 font-mono text-mono-xs text-ink-70">
        Max upload {MAX_UPLOAD_BYTES / 1024 / 1024} MB. We keep briefs for 24
        months, then delete them.
      </p>
    </section>
  );
}
