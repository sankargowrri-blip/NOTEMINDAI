"use client";
import React, { useEffect, useState, useId } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  fontFamily: "Inter",
});

export default function Mermaid({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<boolean>(false);
  const id = useId();
  // Safe ID for SVG (no special characters)
  const safeId = `mermaid-${id.replace(/:/g, "")}`;

  useEffect(() => {
    const renderChart = async () => {
      if (!chart || chart.trim().length < 5) return;

      try {
        setError(false);
        // Clean common AI mistakes
        let cleanChart = chart.trim();
        const lines = cleanChart.split('\n');
        const validStartKeywords = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie', 'quadrantChart', 'mindmap', 'timeline', 'gitGraph'];

        const firstValidLineIndex = lines.findIndex(line =>
          validStartKeywords.some(keyword => line.trim().startsWith(keyword))
        );

        if (firstValidLineIndex !== -1) {
          cleanChart = lines.slice(firstValidLineIndex).join('\n');
        } else {
          // If no valid keyword found, it's probably not a diagram
          return;
        }

        const { svg } = await mermaid.render(safeId, cleanChart);
        setSvg(svg);
      } catch (err) {
        console.error("Mermaid render error:", err);
        setError(true);
      }
    };

    renderChart();
  }, [chart, safeId]);

  if (error) {
    return (
      <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl my-2 italic text-xs text-gray-500 text-center">
        (Could not render diagram)
      </div>
    );
  }

  if (!svg) return null;

  return (
    <div
      className="mermaid-container flex justify-center py-4 bg-white dark:bg-gray-800 rounded-xl my-2 shadow-sm overflow-x-auto transition-opacity duration-300"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
