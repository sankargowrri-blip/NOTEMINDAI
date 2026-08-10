"use client";
import React, { useEffect, useState, useId } from "react";
import mermaid from "mermaid";

// Initialize mermaid once outside the component
if (typeof window !== "undefined") {
  mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    securityLevel: "loose",
    fontFamily: "Inter",
    // In newer versions, we use specialized error handling
    // rather than relying on suppressError.
  });
}

export default function Mermaid({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<boolean>(false);
  const id = useId();
  // Safe ID for SVG (no special characters and unique per render)
  const safeId = `mermaid-${id.replace(/:/g, "")}-${Math.floor(Math.random() * 10000)}`;

  useEffect(() => {
    let isMounted = true;

    const renderChart = async () => {
      if (!chart || chart.trim().length < 10) return;

      try {
        setError(false);
        let cleanChart = chart.trim();

        // 1. Find valid start keyword to ignore any conversational filler
        const validStartKeywords = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie', 'quadrantChart', 'mindmap', 'timeline', 'gitGraph'];
        const lines = cleanChart.split('\n');
        const startIdx = lines.findIndex(l => validStartKeywords.some(k => l.trim().startsWith(k)));

        if (startIdx === -1) return;
        cleanChart = lines.slice(startIdx).join('\n');

        // 2. Auto-fix labels: Wrap labels in double quotes to prevent syntax errors
        cleanChart = cleanChart.replace(/([a-zA-Z0-9_-]+)\(([^"]+?)\)/g, (match, p1, p2) => {
            return `${p1}("${p2.replace(/"/g, "'")}")`;
        });
        cleanChart = cleanChart.replace(/([a-zA-Z0-9_-]+)\[([^\]"]+?)\]/g, (match, p1, p2) => {
            return `${p1}["${p2.replace(/"/g, "'")}"]`;
        });
        cleanChart = cleanChart.replace(/([a-zA-Z0-9_-]+)\{([^}]+?)\}/g, (match, p1, p2) => {
            return `${p1}{"${p2.replace(/"/g, "'")}"}`;
        });

        // 3. Syntax Pre-check
        // mermaid.parse is now async and can throw errors.
        // We use it to validate without side effects.
        try {
            await mermaid.parse(cleanChart);
        } catch (e) {
            if (isMounted) setError(true);
            return;
        }

        // 4. Actual Rendering
        // We use mermaid.render which is async and returns the SVG string.
        const { svg: renderedSvg } = await mermaid.render(safeId, cleanChart);

        if (isMounted) {
          setSvg(renderedSvg);
        }
      } catch (err) {
        console.error("Mermaid rendering failed:", err);
        if (isMounted) setError(true);
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart, safeId]);

  // IMPORTANT: We return null on error or empty SVG.
  // This prevents the "Syntax error in text" bomb icon from appearing at the bottom of the page.
  if (error || !svg) return null;

  return (
    <div
      className="mermaid-container flex justify-center py-4 bg-white dark:bg-gray-800 rounded-xl my-4 shadow-sm overflow-x-auto border border-gray-100 dark:border-gray-700 animate-fade-in"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
