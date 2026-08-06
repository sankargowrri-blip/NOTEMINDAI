"use client";
import React, { useEffect, useState, useRef } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  fontFamily: "Inter",
});

let idCount = 0;

export default function Mermaid({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<boolean>(false);
  const chartId = useRef(`mermaid-svg-${++idCount}`);

  useEffect(() => {
    const renderChart = async () => {
      if (!chart) return;

      try {
        setError(false);
        // Clean common AI mistakes
        let cleanChart = chart.trim();
        // Remove lines that don't look like mermaid (e.g. "Diagram:", "Here is the code:")
        const lines = cleanChart.split('\n');
        const validStartKeywords = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie', 'quadrantChart', 'mindmap', 'timeline', 'gitGraph'];

        const firstValidLineIndex = lines.findIndex(line =>
          validStartKeywords.some(keyword => line.trim().startsWith(keyword))
        );

        if (firstValidLineIndex !== -1) {
          cleanChart = lines.slice(firstValidLineIndex).join('\n');
        }

        const { svg } = await mermaid.render(chartId.current, cleanChart);
        setSvg(svg);
      } catch (err) {
        console.error("Mermaid render error:", err);
        setError(true);
      }
    };

    renderChart();
  }, [chart]);

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl my-2 text-center">
        <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-2">Diagram rendering failed</p>
        <pre className="text-[10px] text-gray-500 overflow-x-auto p-2 bg-white dark:bg-black/20 rounded text-left">
          {chart}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="h-32 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl my-2 animate-pulse">
        <span className="text-xs text-gray-400">Generating diagram...</span>
      </div>
    );
  }

  return (
    <div
      className="mermaid-container flex justify-center py-4 bg-white dark:bg-gray-800 rounded-xl my-2 shadow-sm overflow-x-auto transition-opacity duration-300"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
