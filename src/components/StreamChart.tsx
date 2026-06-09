"use client";

import React, { useState, useMemo, useRef } from "react";

interface StreamHistoryEntry {
  total: number;
  daily: number | null;
}

interface StreamChartProps {
  streams: Record<string, StreamHistoryEntry> | undefined;
  theme: string;
  language: string;
}

type TimeRange = "7d" | "30d" | "all";

export default function StreamChart({ streams, theme, language }: StreamChartProps) {
  const [range, setRange] = useState<TimeRange>("7d");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const isLight = theme === "light";

  // 1. Process and sort the history points
  const allPoints = useMemo(() => {
    if (!streams) return [];
    
    // Sort keys (dates) chronologically
    const sortedDates = Object.keys(streams).sort();
    
    return sortedDates.map(dateStr => {
      const entry = streams[dateStr];
      const parsedDate = new Date(dateStr + "T00:00:00");
      return {
        dateStr,
        label: parsedDate.toLocaleDateString(language === "pt" ? "pt-BR" : "en-US", {
          month: "short",
          day: "numeric",
        }),
        fullDate: parsedDate.toLocaleDateString(language === "pt" ? "pt-BR" : "en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        total: entry.total,
        daily: entry.daily ?? 0,
      };
    });
  }, [streams, language]);

  // 2. Filter points by selected range
  const filteredPoints = useMemo(() => {
    if (range === "7d") return allPoints.slice(-7);
    if (range === "30d") return allPoints.slice(-30);
    return allPoints;
  }, [allPoints, range]);

  const n = filteredPoints.length;

  // 3. Compute chart scale limits
  const { maxTotal, minTotal, maxDaily } = useMemo(() => {
    if (n === 0) return { maxTotal: 0, minTotal: 0, maxDaily: 0 };
    const totals = filteredPoints.map(p => p.total);
    const dailies = filteredPoints.map(p => p.daily);
    
    const maxT = Math.max(...totals);
    const minT = Math.min(...totals);
    const maxD = Math.max(...dailies, 1); // Avoid division by zero
    
    // Give some padding
    const paddingT = (maxT - minT) * 0.1 || 1000;
    return {
      maxTotal: maxT + paddingT,
      minTotal: Math.max(0, minT - paddingT),
      maxDaily: maxD * 1.1,
    };
  }, [filteredPoints, n]);

  const formatNumber = (num: any) => {
    if (num === null || num === undefined || isNaN(num)) return "0";
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  // Dimensions
  const paddingX = 45; // reduced slightly for mobile
  const paddingY = 25;
  const width = 600;
  const height = 220;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Coordinate mappers
  const getX = (index: number) => {
    if (n <= 1) return paddingX + chartWidth / 2;
    return paddingX + (index / (n - 1)) * chartWidth;
  };

  const getYTotal = (val: number) => {
    if (maxTotal === minTotal) return paddingY + chartHeight / 2;
    const ratio = (val - minTotal) / (maxTotal - minTotal);
    return paddingY + chartHeight - ratio * chartHeight;
  };

  const getYDaily = (val: number) => {
    const ratio = val / maxDaily;
    return paddingY + chartHeight - ratio * chartHeight;
  };

  // Path generator for Total Streams line
  const linePath = useMemo(() => {
    if (n < 2) return "";
    let path = `M ${getX(0)} ${getYTotal(filteredPoints[0].total)}`;
    for (let i = 1; i < n; i++) {
      path += ` L ${getX(i)} ${getYTotal(filteredPoints[i].total)}`;
    }
    return path;
  }, [filteredPoints, n, maxTotal, minTotal]);

  // Gradient area path generator
  const areaPath = useMemo(() => {
    if (n < 2) return "";
    const startX = getX(0);
    const endX = getX(n - 1);
    const bottomY = paddingY + chartHeight;
    return `${linePath} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`;
  }, [linePath, n]);

  // Gridlines values
  const gridCount = 4;
  const gridLines = useMemo(() => {
    const lines = [];
    for (let i = 0; i <= gridCount; i++) {
      const ratio = i / gridCount;
      const y = paddingY + chartHeight - ratio * chartHeight;
      const totalVal = minTotal + ratio * (maxTotal - minTotal);
      const dailyVal = ratio * maxDaily;
      lines.push({ y, totalVal, dailyVal });
    }
    return lines;
  }, [minTotal, maxTotal, maxDaily]);

  // Handles both mouse move and touch events
  const handleInteraction = (clientX: number, clientY: number) => {
    if (n === 0 || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    
    // Map X to nearest point index
    const chartLeft = (paddingX / width) * rect.width;
    const chartRenderedWidth = (chartWidth / width) * rect.width;
    const ratio = (relativeX - chartLeft) / chartRenderedWidth;
    let index = Math.round(ratio * (n - 1));
    index = Math.max(0, Math.min(n - 1, index));

    setHoveredIndex(index);
    setTooltipPos({ x: getX(index), y: getYTotal(filteredPoints[index].total) - 12 });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    handleInteraction(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length > 0) {
      // Prevent page scrolling while dragging finger on the chart
      if (e.cancelable) e.preventDefault();
      handleInteraction(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  const activePoint = hoveredIndex !== null ? filteredPoints[hoveredIndex] : null;

  // Compute boundaries for tooltip positioning to prevent viewport overflow on mobile
  const tooltipStyle = useMemo(() => {
    if (!activePoint) return {};
    const pct = (tooltipPos.x / width) * 100;
    
    // Dynamically adjust centering translation depending on how close we are to the edges
    let transformX = "-50%";
    if (pct < 20) transformX = "-10%";
    else if (pct > 80) transformX = "-90%";

    return {
      left: `${pct}%`,
      top: `${(tooltipPos.y / height) * 100}%`,
      transform: `translate(${transformX}, -100%)`
    };
  }, [activePoint, tooltipPos]);

  return (
    <div className="space-y-4" ref={containerRef}>
      {/* Zoom / Range controls & Axis Labels */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 text-xs">
        <div className="flex items-center gap-1.5">
          <span className={isLight ? "text-neutral-500" : "text-mauve"}>
            {language === "pt" ? "período:" : "zoom:"}
          </span>
          {(["7d", "30d", "all"] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => {
                setRange(r);
                setHoveredIndex(null);
              }}
              className={`px-3 py-1.5 md:px-2 md:py-0.5 rounded font-mono font-bold uppercase transition-all cursor-pointer text-[11px] md:text-xs min-h-[28px] md:min-h-0 ${
                range === r
                  ? (isLight ? "bg-black text-white" : "bg-rose text-floral-bg")
                  : (isLight ? "text-neutral-500 hover:text-black" : "text-mauve hover:text-white")
              }`}
            >
              {r === "all" ? (language === "pt" ? "tudo" : "all") : r}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 font-mono text-[9px] md:text-[10px]">
          <span className="flex items-center gap-1">
            <span className={`w-2.5 h-0.5 inline-block ${isLight ? "bg-black" : "bg-rose"}`}></span>
            {language === "pt" ? "total" : "total"}
          </span>
          <span className="flex items-center gap-1">
            <span className={`w-2.5 h-2 inline-block rounded-xs ${isLight ? "bg-neutral-300" : "bg-wine-deep border border-panel-border/85"}`}></span>
            {language === "pt" ? "ganho" : "gain"}
          </span>
        </div>
      </div>

      {n === 0 ? (
        <div className={`h-[180px] md:h-[220px] flex items-center justify-center text-xs border border-dashed rounded ${isLight ? "bg-neutral-50/50 border-neutral-200 text-neutral-400" : "bg-neutral-950/40 border-neutral-900 text-neutral-500"}`}>
          {language === "pt" ? "histórico de streams insuficiente para exibir." : "insufficient stream history to display."}
        </div>
      ) : (
        <div className="relative touch-none">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto select-none overflow-visible"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchStart={handleTouchMove}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseLeave}
          >
            {/* Gradients */}
            <defs>
              <linearGradient id="chartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isLight ? "#e5e5e5" : "#e05375"} stopOpacity={isLight ? 0.3 : 0.2} />
                <stop offset="100%" stopColor={isLight ? "#f5f5f5" : "#e05375"} stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Gridlines & Y Axis values */}
            {gridLines.map((line, idx) => (
              <g key={idx}>
                {/* Horizontal line */}
                <line
                  x1={paddingX}
                  y1={line.y}
                  x2={width - paddingX}
                  y2={line.y}
                  stroke={isLight ? "#e5e5e5" : "#2c111e"}
                  strokeWidth="1"
                  strokeDasharray={idx === 0 ? "0" : "4 4"}
                />

                {/* Left Axis label (Total streams) */}
                <text
                  x={paddingX - 6}
                  y={line.y + 3}
                  textAnchor="end"
                  className={`font-mono text-[8px] md:text-[9px] font-semibold ${isLight ? "fill-neutral-500" : "fill-mauve"}`}
                >
                  {line.totalVal >= 1_000_000_000
                    ? (line.totalVal / 1_000_000_000).toFixed(2) + "B"
                    : (line.totalVal / 1_000_000).toFixed(0) + "M"}
                </text>

                {/* Right Axis label (Daily streams) */}
                <text
                  x={width - paddingX + 6}
                  y={line.y + 3}
                  textAnchor="start"
                  className={`font-mono text-[8px] md:text-[9px] font-semibold ${isLight ? "fill-neutral-500" : "fill-mauve"}`}
                >
                  {line.dailyVal >= 1_000_000
                    ? (line.dailyVal / 1_000_000).toFixed(1) + "M"
                    : (line.dailyVal / 1000).toFixed(0) + "k"}
                </text>
              </g>
            ))}

            {/* Daily streams: BARS */}
            {filteredPoints.map((p, idx) => {
              const barWidth = Math.max(2.5, Math.min(18, (chartWidth / n) * 0.45));
              const x = getX(idx) - barWidth / 2;
              const y = getYDaily(p.daily);
              const barHeight = Math.max(0, paddingY + chartHeight - y);
              const isHovered = hoveredIndex === idx;

              return (
                <rect
                  key={idx}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="1"
                  fill={isHovered 
                    ? (isLight ? "#737373" : "#e05375") 
                    : (isLight ? "#e5e5e5" : "#2a1221")
                  }
                  stroke={isHovered 
                    ? (isLight ? "#525252" : "#ff8da9") 
                    : (isLight ? "none" : "#3d192f")
                  }
                  strokeWidth={isLight ? 0 : 1}
                  className="transition-all duration-150"
                />
              );
            })}

            {/* Total streams: AREA */}
            <path d={areaPath} fill="url(#chartAreaGrad)" />

            {/* Total streams: LINE */}
            <path
              d={linePath}
              fill="none"
              stroke={isLight ? "#000000" : "#e05375"}
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Interactive indicator dots on hover */}
            {hoveredIndex !== null && (
              <g>
                {/* Vertical line tracker */}
                <line
                  x1={getX(hoveredIndex)}
                  y1={paddingY}
                  x2={getX(hoveredIndex)}
                  y2={paddingY + chartHeight}
                  stroke={isLight ? "#999999" : "#e05375"}
                  strokeWidth="0.8"
                  strokeDasharray="2 2"
                />

                {/* Outer ring */}
                <circle
                  cx={getX(hoveredIndex)}
                  cy={getYTotal(filteredPoints[hoveredIndex].total)}
                  r="6.5"
                  fill={isLight ? "#000000" : "#e05375"}
                  opacity="0.25"
                />

                {/* Inner dot */}
                <circle
                  cx={getX(hoveredIndex)}
                  cy={getYTotal(filteredPoints[hoveredIndex].total)}
                  r="3.5"
                  fill={isLight ? "#ffffff" : "#fff"}
                  stroke={isLight ? "#000000" : "#e05375"}
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* X Axis Date labels (start, middle, end) */}
            {n > 1 && (
              <g className={`font-mono text-[8px] md:text-[9px] ${isLight ? "fill-neutral-500" : "fill-mauve"}`}>
                <text x={paddingX} y={height - 6} textAnchor="start">
                  {filteredPoints[0].label}
                </text>
                {n >= 5 && (
                  <text x={paddingX + chartWidth / 2} y={height - 6} textAnchor="middle">
                    {filteredPoints[Math.floor(n / 2)].label}
                  </text>
                )}
                <text x={width - paddingX} y={height - 6} textAnchor="end">
                  {filteredPoints[n - 1].label}
                </text>
              </g>
            )}
          </svg>

          {/* Interactive Tooltip Card (Styled responsively) */}
          {activePoint && (
            <div
              className={`absolute pointer-events-none p-2.5 rounded shadow-xl border text-[10px] md:text-xs font-mono transition-all duration-75 z-20 max-w-[200px] md:max-w-xs ${
                isLight
                  ? "bg-white border-neutral-200 text-neutral-800"
                  : "bg-neutral-950/95 border-panel-border text-white"
              }`}
              style={tooltipStyle}
            >
              <div className={`font-bold border-b pb-1 mb-1 ${isLight ? "border-neutral-100" : "border-neutral-900"}`}>
                {activePoint.fullDate}
              </div>
              <div className="flex justify-between gap-4 mb-0.5">
                <span className={isLight ? "text-neutral-500" : "text-mauve"}>
                  {language === "pt" ? "total:" : "total:"}
                </span>
                <span className={`font-bold ${isLight ? "text-neutral-950" : "text-rose"}`}>
                  {formatNumber(activePoint.total)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className={isLight ? "text-neutral-500" : "text-mauve"}>
                  {language === "pt" ? "ganho:" : "gain:"}
                </span>
                <span className="font-bold text-emerald-500">
                  +{formatNumber(activePoint.daily)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
