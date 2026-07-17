// IntersectionObserver scroll-spy shared by the article TOC and the
// contribute page's "I want to…" list: marks the nav link whose target
// the reader is in with aria-current="true".

// Reading line, px from viewport top — clears the sticky header.
const LINE = 140;

export function scrollSpy(nav: HTMLElement) {
  const links = [...nav.querySelectorAll("a")].filter((a) => a.hash);
  const targets = links
    .map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1))))
    .filter((el): el is HTMLElement => el !== null);
  if (targets.length === 0) return;

  // A target is "passed" once it crosses up through the reading band;
  // the last passed target is the one being read.
  const passed = targets.map(() => false);
  let atBottom = false;

  const render = () => {
    const current = atBottom
      ? targets.at(-1)
      : targets[Math.max(0, passed.lastIndexOf(true))];
    for (const a of links)
      a.setAttribute("aria-current", String(a.hash === `#${current?.id}`));
  };

  const band = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const i = targets.indexOf(e.target as HTMLElement);
        passed[i] = e.isIntersecting || e.boundingClientRect.top < LINE;
      }
      render();
    },
    // Band from the reading line down to 25% of the viewport
    { rootMargin: `-${LINE}px 0px -75% 0px` },
  );
  for (const t of targets) band.observe(t);

  // A short final section may never reach the band — within a couple of px
  // of the page bottom, the last target wins. Plain scroll math: a zero-area
  // sentinel at the exact document edge is an IntersectionObserver boundary
  // case browsers report inconsistently.
  const onScroll = () => {
    const bottom =
      window.innerHeight + window.scrollY
      >= document.documentElement.scrollHeight - 2;
    if (bottom !== atBottom) {
      atBottom = bottom;
      render();
    }
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}
