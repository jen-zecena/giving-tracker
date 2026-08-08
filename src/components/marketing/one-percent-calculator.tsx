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
        {/* Preview feedback: the bare native slider read as static — add an
            explicit drag hint and an oversized grabbable thumb. */}
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/70">
          <span aria-hidden="true">↔</span>
          Drag to set your income
        </div>
        <input
          type="range"
          min={25_000}
          max={250_000}
          step={5_000}
          value={salary}
          onChange={(e) => setSalary(Number(e.target.value))}
          aria-label="Annual income"
          className={
            "w-full cursor-grab active:cursor-grabbing appearance-none rounded-full bg-white/20 h-1.5 outline-none " +
            "focus-visible:ring-2 focus-visible:ring-white/40 " +
            "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 " +
            "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white " +
            "[&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-(--green-300) " +
            "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full " +
            "[&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-solid [&::-moz-range-thumb]:border-(--green-300)"
          }
        />
        <div className="mt-1 flex justify-between font-mono text-[11px] text-white/40">
          <span>$25k</span>
          <span>$250k</span>
        </div>
      </div>
    </div>
  );
}
