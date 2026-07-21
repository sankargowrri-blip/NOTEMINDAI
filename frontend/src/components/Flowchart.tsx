"use client";

interface FlowNode {
  id: string;
  type: "start" | "end" | "process" | "decision" | "input" | "output";
  label: string;
}

interface FlowEdge {
  from: string;
  to: string;
  label?: string;
}

interface Props {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

const NODE_COLORS: Record<string, string> = {
  start: "#22c55e",
  end: "#ef4444",
  process: "#4f58ff",
  decision: "#f59e0b",
  input: "#06b6d4",
  output: "#8b5cf6",
};

const NODE_SHAPES: Record<string, string> = {
  start: "rounded-full",
  end: "rounded-full",
  process: "rounded-lg",
  decision: "rotate-45",
  input: "rounded-lg",
  output: "rounded-lg",
};

export default function Flowchart({ nodes, edges }: Props) {
  if (!nodes.length) return <p className="text-gray-400 text-sm">No flowchart data</p>;

  // Simple vertical layout
  const W = 600;
  const NODE_H = 44;
  const GAP = 60;
  const H = nodes.length * (NODE_H + GAP) + 40;
  const cx = W / 2;

  const positions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((n, i) => {
    positions[n.id] = { x: cx, y: 30 + i * (NODE_H + GAP) };
  });

  const edgesSvg = edges.map((e) => {
    const from = positions[e.from];
    const to = positions[e.to];
    if (!from || !to) return "";
    const x1 = from.x, y1 = from.y + NODE_H / 2;
    const x2 = to.x, y2 = to.y - NODE_H / 2;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#6366f1" stroke-width="2" marker-end="url(#arrow)"/>
      ${e.label ? `<text x="${(x1 + x2) / 2 + 8}" y="${(y1 + y2) / 2}" fill="#9ca3af" font-size="10" font-family="Inter,sans-serif">${e.label}</text>` : ""}`;
  }).join("");

  const nodesSvg = nodes.map((n) => {
    const pos = positions[n.id];
    if (!pos) return "";
    const color = NODE_COLORS[n.type] || "#4f58ff";
    const isRound = n.type === "start" || n.type === "end";
    const rVal = isRound ? 22 : 6;
    const label = n.label.length > 24 ? n.label.slice(0, 22) + "…" : n.label;
    const typeLabel = n.type.toUpperCase();
    return `<rect x="${pos.x - 90}" y="${pos.y - NODE_H / 2}" width="180" height="${NODE_H}" rx="${rVal}" fill="${color}" fill-opacity="0.9"/>
      <text x="${pos.x}" y="${pos.y - 4}" text-anchor="middle" fill="white" font-size="11" font-weight="600" font-family="Inter,sans-serif">${label}</text>
      <text x="${pos.x}" y="${pos.y + 10}" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="9" font-family="Inter,sans-serif">[${typeLabel}]</text>`;
  }).join("");

  const svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-height:500px;">
    <defs>
      <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1"/>
      </marker>
    </defs>
    ${edgesSvg}${nodesSvg}
  </svg>`;

  return (
    <div
      className="w-full bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
