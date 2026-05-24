"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";

type MiniSparklineProps = {
  data: number[];
  /** Emerald-positive vs amber-neutral */
  variant?: "emerald" | "violet" | "amber";
  className?: string;
};

const stroke: Record<NonNullable<MiniSparklineProps["variant"]>, string> = {
  emerald: "#34d399",
  violet: "#a78bfa",
  amber: "#fbbf24",
};

export function MiniSparkline({ data, variant = "emerald", className = "" }: MiniSparklineProps) {
  const uid = useId().replace(/:/g, "");
  const id = `spark-fill-${variant}-${uid}`;
  const chartData = data.map((v, i) => ({ i, v }));

  return (
    <div className={`h-full w-full min-w-[56px] ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke[variant]} stopOpacity={0.45} />
              <stop offset="100%" stopColor={stroke[variant]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <Area
            type="monotone"
            dataKey="v"
            stroke={stroke[variant]}
            strokeWidth={2.25}
            fill={`url(#${id})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
