import { execSync } from "node:child_process";
import { visit } from "unist-util-visit";

/**
 * Remark plugin that converts ```d2 code blocks to inline SVG
 * using the `d2` CLI at build time.
 */
export default function remarkD2() {
  return (tree: any) => {
    visit(tree, "code", (node: any, index, parent: any) => {
      if (node.lang !== "d2" || index === undefined || !parent) return;

      try {
        const svg = execSync("d2 --pad 16 --sketch -", {
          input: node.value,
          encoding: "utf-8",
          timeout: 15000,
        });

        parent.children.splice(index, 1, {
          type: "html",
          value: `<div class="d2-diagram">${svg.trim()}</div>`,
        });
      } catch (err) {
        console.error(
          `[remark-d2] Failed to render D2 diagram: ${err instanceof Error ? err.message : err}`,
        );
      }
    });
  };
}
