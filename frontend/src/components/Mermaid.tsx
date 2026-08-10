"use client";
import React, { useEffect, useState, useId } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  fontFamily: "Inter",
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

        // Find valid start
        const validStartKeywords = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie', 'quadrantChart', 'mindmap', 'timeline', 'gitGraph'];
        const lines = cleanChart.split('\n');
        const startIdx = lines.findIndex(l => validStartKeywords.some(k => l.trim().startsWith(k)));

        if (startIdx === -1) return;
        cleanChart = lines.slice(startIdx).join('\n');

        // Fix syntax (Quotes)
        cleanChart = cleanChart.replace(/([a-zA-Z0-9_-]+)\(([^"]+?)\)/g, '$1("$2")');
        cleanChart = cleanChart.replace(/([a-zA-Z0-9_-]+)\[([^"]+?)\]/g, '$1["$2"]');
        cleanChart = cleanChart.replace(/([a-zA-Z0-9_-]+)\{([^"]+?)\}/g, '$1{"$2"}');

        // Safety Pre-check
        try {
            await mermaid.parse(cleanChart);
        } catch (e) {
            setError(true);
            return;
        }

        const { svg: renderedSvg } = await mermaid.render(safeId, cleanChart);
        setSvg(renderedSvg);
      } catch (err) {
        setError(true);
      }
    };

    renderChart();
  }, [chart, safeId]);

  // HIDE broken diagrams to keep UI clean
  if (error || !svg) return null;

  return (
    <div
      className="mermaid-container flex justify-center py-4 bg-white dark:bg-gray-800 rounded-xl my-2 shadow-sm overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
