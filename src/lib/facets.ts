// Facet buttons filtering a list of cards, shared by the catalog and
// tutorials pages. Cards carry data-<facet>; each .facet-option carries
// data-facet and data-value. Runs in the browser.
interface Hooks {
  // How a card matches a chosen value; default is equality on its data attribute
  match?: (card: HTMLElement, key: string, value: string) => boolean;
  // Page-specific conditions a card must also pass
  extra?: (card: HTMLElement) => boolean;
  // Page-specific filters in effect, which keep the Clear button shown
  active?: () => boolean;
  onClear?: () => void;
  onApply?: (matched: number) => void;
}

export function facetFilter(cards: HTMLElement[], hooks: Hooks = {}) {
  const buttons = [
    ...document.querySelectorAll<HTMLButtonElement>(".facet-option"),
  ];
  const clear = document.querySelector<HTMLButtonElement>("#clear-filters");
  const count = document.querySelector("#match-count");
  const empty = document.querySelector<HTMLElement>("#empty-state");
  // The facets are whatever the sidebar renders
  const keys = [...new Set(buttons.map((b) => b.dataset.facet ?? ""))].filter(
    Boolean,
  );
  const state: Record<string, string> = {};
  const match =
    hooks.match ?? ((card, key, value) => card.dataset[key] === value);

  function apply() {
    let matched = 0;
    for (const card of cards) {
      const show =
        keys.every((k) => !state[k] || match(card, k, state[k]))
        && (hooks.extra?.(card) ?? true);
      card.hidden = !show;
      if (show) matched++;
    }
    if (count) count.textContent = String(matched);
    if (empty) empty.hidden = matched > 0;
    for (const b of buttons)
      b.setAttribute(
        "aria-pressed",
        String(state[b.dataset.facet ?? ""] === b.dataset.value),
      );
    if (clear) clear.hidden = keys.every((k) => !state[k]) && !hooks.active?.();
    hooks.onApply?.(matched);
  }

  for (const b of buttons)
    b.addEventListener("click", () => {
      state[b.dataset.facet ?? ""] = b.dataset.value ?? "";
      apply();
    });
  clear?.addEventListener("click", () => {
    for (const k of keys) state[k] = "";
    hooks.onClear?.();
    apply();
  });
  // Filters start collapsed on small screens so results stay above the fold
  if (matchMedia("(max-width: 860px)").matches)
    for (const d of document.querySelectorAll("aside details[open]"))
      d.removeAttribute("open");

  return { state, keys, apply };
}
