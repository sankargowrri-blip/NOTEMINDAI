"use client";
import React, { useEffect, useState, useId } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  fontFamily: "Inter",
  // Suppress default error UI (the bomb icon)
  suppressError: true,
});

export default function Mermaid({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<boolean>(false);
  const id = useId();
  const safeId = `mermaid-${id.replace(/:/g, "")}-${Math.floor(Math.random() * 10000)}`;

  useEffect(() => {
    const renderChart = async () => {
      if (!chart || chart.trim().length < 10) return;

      try {
        setError(false);
        let cleanChart = chart.trim();

        const lines = cleanChart.split('\n');
        const validStartKeywords = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie', 'quadrantChart', 'mindmap', 'timeline', 'gitGraph'];

        const firstValidLineIndex = lines.findIndex(line =>
          validStartKeywords.some(keyword => line.trim().startsWith(keyword))
        );

        if (firstValidLineIndex === -1) return;
        cleanChart = lines.slice(firstValidLineIndex).join('\n');

        // Auto-fix labels
        cleanChart = cleanChart.replace(/([a-zA-Z0-9_-]+)\(([^"]+?)\)/g, '$1("$2")');
        cleanChart = cleanChart.replace(/([a-zA-Z0-9_-]+)\[([^"]+?)\]/g, '$1["$2"]');
        cleanChart = cleanChart.replace(/([a-zA-Z0-9_-]+)\{([^"]+?)\}/g, '$1{"$2"}');

        // Syntax Pre-check
        try {
            await mermaid.parse(cleanChart);
        } catch (e) {
            console.warn("Mermaid syntax check failed - skipping render.");
            setError(true);
            return;
        }

        const { svg } = await mermaid.render(safeId, cleanChart);
        setSvg(svg);
      } catch (err) {
        console.error("Mermaid final render failed:", err);
        setError(true);
      }
    };

    renderChart();
  }, [chart, safeId]);

  // If there is an error, we return null to completely HIDE the broken diagram.
  // This prevents the "Syntax error" bomb icon from appearing.
  if (error || !svg) return null;

  return (
    <div
      className="mermaid-container flex justify-center py-4 bg-white dark:bg-gray-800 rounded-xl my-2 shadow-sm overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
