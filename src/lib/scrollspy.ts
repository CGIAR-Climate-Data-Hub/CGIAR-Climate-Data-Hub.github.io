// Scroll-spy shared by the article TOC and the contribute page's
// "I want to…" list: marks the nav link whose target the reader is in with
// aria-current="true". Stateless on purpose — the current section is
// recomputed from live geometry every scroll, so instant anchor jumps can't
// leave stale state behind (IntersectionObserver only reports *changes*, so
// sections skipped over in a jump kept their old flags).

// Reading line, px from viewport top — clears the sticky header.
const LINE = 140;

export function scrollSpy(nav: HTMLElement) {
  const links = [...nav.querySelectorAll("a")].filter((a) => a.hash);
  const targets = links
    .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
    .filter((el): el is HTMLElement => el !== null);
  if (targets.length === 0) return;

  // Writes only when the active section changes — scroll fires every frame,
  // and per-frame attribute writes force layout thrash with the reads above
  let currentId: string | undefined;
  const render = () => {
    // Within a couple of px of the page bottom the last target wins — a
    // short final section may never reach the reading line.
    const atBottom =
      window.innerHeight + window.scrollY
      >= document.documentElement.scrollHeight - 2;
    // Otherwise: the last target whose top has crossed up through the line
    // is the one being read; before any has, the first target stands in.
    const current = atBottom
      ? targets.at(-1)
      : (targets.findLast((t) => t.getBoundingClientRect().top < LINE)
        ?? targets[0]);
    if (current?.id === currentId) return;
    currentId = current?.id;
    for (const a of links)
      a.setAttribute("aria-current", String(a.hash === `#${currentId}`));
  };

  addEventListener("scroll", render, { passive: true });
  addEventListener("resize", render, { passive: true });
  render();
}
