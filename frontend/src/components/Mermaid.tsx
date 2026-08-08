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
  const safeId = `mermaid-${id.replace(/:/g, "")}`;

  useEffect(() => {
    const renderChart = async () => {
      if (!chart || chart.trim().length < 5) return;

      try {
        setError(false);
        let cleanChart = chart.trim();

        // Remove conversational filler if AI missed backticks
        const lines = cleanChart.split('\n');
        const validStartKeywords = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie', 'quadrantChart', 'mindmap', 'timeline', 'gitGraph'];

        const firstValidLineIndex = lines.findIndex(line =>
          validStartKeywords.some(keyword => line.trim().startsWith(keyword))
        );

        if (firstValidLineIndex !== -1) {
          cleanChart = lines.slice(firstValidLineIndex).join('\n');
        }

        // Auto-fix unquoted labels which often cause syntax errors
        // Matches node definitions like: A(Label with spaces) or B[Label (with parens)]
        // and wraps the label in quotes: A["Label with spaces"]
        cleanChart = cleanChart.replace(/([a-zA-Z0-9_-]+)\(([^)]+)\)/g, '$1(["$2"])');
        cleanChart = cleanChart.replace(/([a-zA-Z0-9_-]+)\[([^\]]+)\]/g, '$1["$2"]');

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
      <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl my-2 italic text-[10px] text-gray-500 text-center flex flex-col items-center gap-2">
        <span>(Diagram syntax issue detected)</span>
        <pre className="max-w-full overflow-x-auto text-[9px] bg-white/50 dark:bg-black/20 p-2 rounded">
          {chart.slice(0, 100)}...
        </pre>
      </div>
    );
  }

  if (!svg) return null;

  return (
    <div
      className="mermaid-container flex justify-center py-4 bg-white dark:bg-gray-800 rounded-xl my-2 shadow-sm overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
