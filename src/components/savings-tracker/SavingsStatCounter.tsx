"use client";

import { useSyncExternalStore } from "react";
import { useCountUpNumber } from "@/hooks/useCountUpNumber";

const noopSubscribe = () => () => {};

type SavingsStatCounterProps = {
  value: number;
  format: (n: number) => string;
  durationMs?: number;
  className?: string;
};

export function SavingsStatCounter({ value, format, durationMs = 1040, className = "" }: SavingsStatCounterProps) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const display = useCountUpNumber(value, { durationMs, skipAnimation: !mounted });
  return <span className={`tabular-nums tracking-tight ${className}`}>{format(display)}</span>;
}
