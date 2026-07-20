// Build-time self-linking headings: markdown h2-h4 render wrapped in a
// `.section-link` anchor, so section URLs are copyable with zero client JS
// (Layout.astro's replaceState handler only swaps history behaviour).
import type { SatteriProcessorOptions } from "@astrojs/markdown-satteri";

type HastPlugin = NonNullable<SatteriProcessorOptions["hastPlugins"]>[number];

type Nodeish = {
  type: string;
  tagName?: string;
  children?: readonly Nodeish[];
};

// A heading that already contains a link can't be wrapped — nested <a> is
// invalid HTML.
const containsAnchor = (node: Nodeish): boolean =>
  node.children?.some(
    (child) =>
      (child.type === "element" && child.tagName === "a")
      || containsAnchor(child),
  ) ?? false;

/**
 * Ids come from `satteriHeadingIdsPlugin()`, which must run before this one
 * (see astro.config); "footnote-label" is GFM's sr-only footnotes heading —
 * wrapping it would turn a hidden label into a hidden link.
 */
export const headingAnchors = (): HastPlugin => ({
  element: {
    filter: ["h2", "h3", "h4"],
    visit(node) {
      const id = node.properties?.id;
      if (typeof id !== "string" || id === "footnote-label") return;
      if (containsAnchor(node)) return;

      return {
        ...node,
        children: [
          {
            children: [...node.children],
            properties: { className: ["section-link"], href: `#${id}` },
            tagName: "a",
            type: "element",
          },
        ],
      };
    },
  },
  name: "heading-anchors",
});
