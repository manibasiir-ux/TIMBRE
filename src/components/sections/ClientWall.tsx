import { CLIENTS } from "@/content/clients";

/**
 * The client wall, specification §6.1 item 7.
 *
 * A five by three grid of names in `ink-40`, each coming to full `ink` on
 * hover. §6.1 asks for logos; there are none, so these are wordmarks — see
 * content/clients for why that is the honest placeholder rather than fifteen
 * invented marks.
 *
 * §6.1 sets the names in `ink-40` and brings them to `ink` on hover. They are
 * `ink-70` instead, because `ink-40` measures 3.54:1 and §3.1 prohibits it for
 * text outright — the two rules contradict each other and the accessibility one
 * wins. `ink-70` is 8.86:1, still visibly secondary to the four clients with
 * case studies behind them, which take full `ink`. That contrast is also what
 * carries the meaning here: the wall never implies more depth than the site can
 * actually show.
 *
 * Server-rendered with no client JavaScript. It is fifteen names and a grid.
 */
export function ClientWall() {
  return (
    <section aria-labelledby="clients-title" className="shell section-rhythm">
      <h2 id="clients-title" className="font-display text-h2 text-ink">
        Selected clients
      </h2>
      <p className="mt-3 font-mono text-mono-xs text-ink-70">
        {String(CLIENTS.length).padStart(2, "0")} engagements ·{" "}
        {CLIENTS.filter((client) => client.cased).length} published
      </p>

      <ul className="mt-12 grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
        {CLIENTS.map((client) => (
          <li key={client.name}>
            <span
              className={`block font-display text-h3 ${
                client.cased ? "text-ink" : "text-ink-70"
              }`}
            >
              {client.name}
            </span>
            <span className="mt-1 block font-mono text-mono-xs text-ink-70">
              {client.sector}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
