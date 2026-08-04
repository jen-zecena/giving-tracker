"use client";

import { useState } from "react";

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

/**
 * DS bento centerpiece: the live 1% calculator on a deep-green tile.
 * Purely client-side arithmetic — nothing is stored or sent anywhere.
 */
export function OnePercentCalculator() {
  const [salary, setSalary] = useState(75_000);
  const yearly = salary * 0.01;

  return (
    <div className="col-span-full sm:col-span-3 flex flex-col gap-3.5 rounded-2xl bg-surface-inverse p-6">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/45">
        What 1% looks like for you
      </span>
      <div className="flex items-baseline gap-2.5">
        <span className="font-mono text-[52px] font-semibold tracking-[-0.04em] text-white">
          {money(yearly / 12)}
        </span>
        <span className="text-[17px] text-white/60">a month</span>
      </div>
      <p className="text-sm text-white/65 font-mono">
        {money(yearly)} a year on a {money(salary)} income.
      </p>
      <div className="mt-auto">
        <input
          type="range"
          min={25_000}
          max={250_000}
          step={5_000}
          value={salary}
          onChange={(e) => setSalary(Number(e.target.value))}
          aria-label="Annual income"
          className="w-full"
          style={{ accentColor: "var(--green-300)" }}
        />
        <div className="flex justify-between font-mono text-[11px] text-white/40">
          <span>$25k</span>
          <span>$250k</span>
        </div>
      </div>
    </div>
  );
}
