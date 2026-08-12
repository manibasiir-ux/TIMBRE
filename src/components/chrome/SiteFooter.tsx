import { DEFAULT_LOCALE, getDictionary } from "@/lib/i18n";

/**
 * The site's one persistent disclosure.
 *
 * TIMBRE is a fictional studio built as a portfolio piece. Until this component
 * existed, the only place that was written down was a handful of source
 * comments — so a visitor met four case studies with named clients, quantified
 * results and a credits list, and had nothing to tell them apart from an agency
 * describing real work. That is the kind of ambiguity that is nobody's fault
 * right up until it is, and the fix costs one line on every route.
 *
 * `--text-small` rather than a mono token: §2.1 reserves the mono scale for
 * data and labels, and every `--text-mono*` renders uppercase, which turns a
 * two-clause sentence into something nobody finishes reading. `--color-ink-70`
 * is 8.86:1 on ground — quiet by design, never quiet enough to be deniable.
 *
 * Server-rendered, so the statement is in the initial HTML rather than arriving
 * with hydration. A disclosure that depends on JavaScript is not a disclosure.
 */
export function SiteFooter() {
  const ui = getDictionary(DEFAULT_LOCALE);

  return (
    <footer className="relative z-10 border-t border-ink-15">
      <div className="shell py-12">
        <p className="max-w-[64ch] text-small text-ink-70">
          {ui.disclosure.footer}
        </p>
      </div>
    </footer>
  );
}
