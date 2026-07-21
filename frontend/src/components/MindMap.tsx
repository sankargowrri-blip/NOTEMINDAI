"use client";
import { useEffect, useRef } from "react";

interface MindMapNode {
  label: string;
  children?: MindMapNode[];
}

interface Props {
  root: string;
  children: MindMapNode[];
}

// Simple SVG-based mind map renderer (no D3 needed)
function flattenNodes(node: MindMapNode, parent: string | undefined = undefined, depth = 0): { id: string; label: string; parent: string | undefined; depth: number }[] {
  const id = `${depth}-${node.label}`;
  const result: { id: string; label: string; parent: string | undefined; depth: number }[] = [{ id, label: node.label, parent, depth }];
  if (node.children) {
    node.children.forEach((child) => result.push(...flattenNodes(child, id, depth + 1)));
  }
  return result;
}

export default function MindMap({ root, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // Build simple radial layout
    const nodes: { id: string; label: string; parent: string | undefined; depth: number }[] = [
      { id: "root", label: root, parent: undefined, depth: 0 },
    ];
    children.forEach((child, i) => {
      nodes.push({ id: `1-${i}`, label: child.label, parent: "root", depth: 1 });
      if (child.children) {
        child.children.forEach((grandchild, j) => {
          nodes.push({ id: `2-${i}-${j}`, label: grandchild.label, parent: `1-${i}`, depth: 2 });
        });
      }
    });

    const W = 700, H = 500;
    const cx = W / 2, cy = H / 2;
    const radii = [0, 130, 230];

    // Position nodes
    const positioned: Record<string, { x: number; y: number; label: string; depth: number }> = {};
    positioned["root"] = { x: cx, y: cy, label: root, depth: 0 };

    const level1 = nodes.filter((n) => n.depth === 1);
    level1.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / level1.length - Math.PI / 2;
      positioned[n.id] = { x: cx + radii[1] * Math.cos(angle), y: cy + radii[1] * Math.sin(angle), label: n.label, depth: 1 };
    });

    const level2 = nodes.filter((n) => n.depth === 2);
    const parentAngles: Record<string, number> = {};
    level1.forEach((n, i) => { parentAngles[n.id] = (2 * Math.PI * i) / level1.length - Math.PI / 2; });

    const level2ByParent: Record<string, string[]> = {};
    level2.forEach((n) => {
      if (!level2ByParent[n.parent!]) level2ByParent[n.parent!] = [];
      level2ByParent[n.parent!].push(n.id);
    });

    Object.entries(level2ByParent).forEach(([parentId, childIds]) => {
      const baseAngle = parentAngles[parentId] || 0;
      childIds.forEach((id, i) => {
        const spread = 0.4;
        const angle = baseAngle + spread * (i - (childIds.length - 1) / 2);
        const node = nodes.find((n) => n.id === id)!;
        positioned[id] = { x: cx + radii[2] * Math.cos(angle), y: cy + radii[2] * Math.sin(angle), label: node.label, depth: 2 };
      });
    });

    // Render SVG
    const edges = nodes.filter((n) => n.parent).map((n) => {
      const from = positioned[n.parent!];
      const to = positioned[n.id];
      if (!from || !to) return "";
      return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="#6366f1" stroke-width="${n.depth === 1 ? 2 : 1}" stroke-opacity="0.5"/>`;
    }).join("");

    const nodesSvg = Object.entries(positioned).map(([id, pos]) => {
      const colors = ["#4f58ff", "#8b5cf6", "#06b6d4"];
      const radii2 = [28, 22, 18];
      const r = radii2[pos.depth] || 18;
      const color = colors[pos.depth] || "#6366f1";
      const label = pos.label.length > 18 ? pos.label.slice(0, 16) + "…" : pos.label;
      const fontSize = pos.depth === 0 ? 11 : pos.depth === 1 ? 10 : 9;
      return `<circle cx="${pos.x}" cy="${pos.y}" r="${r}" fill="${color}" fill-opacity="0.85"/>
        <text x="${pos.x}" y="${pos.y}" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="${fontSize}" font-family="Inter,sans-serif" font-weight="${pos.depth === 0 ? 700 : 500}">${label}</text>`;
    }).join("");

    containerRef.current.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-height:420px;">${edges}${nodesSvg}</svg>`;
  }, [root, children]);

  return (
    <div ref={containerRef} className="w-full bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden" />
  );
}
