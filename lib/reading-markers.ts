import type { Root, Element } from "hast";
export type ReadingMarker = { percent: number; offset: number };
// Keep Markdown intact: measure reading progress at the end of the containing block.
export function readingMarkers(markers: ReadingMarker[] = []) {
  return (tree: Root) => {
    const pending = [...markers].sort((a, b) => a.offset - b.offset);
    const children: Root["children"] = [];
    const markerNode = (percent: number): Element => ({
      type: "element",
      tagName: "span",
      properties: {
        className: ["reading-marker"],
        "data-reading-marker": percent,
        "aria-hidden": "true",
      },
      children: [],
    });
    for (const child of tree.children) {
      children.push(child);
      const end = child.position?.end.offset;
      while (pending.length && end !== undefined && pending[0].offset <= end)
        children.push(markerNode(pending.shift()!.percent));
    }
    for (const marker of pending) children.push(markerNode(marker.percent));
    tree.children = children;
  };
}
