"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { format, isValid, parseISO, subDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TIMEFRAME_LABELS,
  TIMEFRAME_OPTIONS,
  type TimeframeOption,
} from "@/lib/dashboard-timeframe";

function toDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = parseISO(value);
  return isValid(d) ? d : undefined;
}

function iso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

interface TimeframeSelectorProps {
  option: TimeframeOption;
  from?: string;
  to?: string;
}

/**
 * URL-driven dashboard timeframe control. Preset changes navigate to
 * `?range=<opt>`; the custom option opens a range calendar and navigates to
 * `?range=custom&from=…&to=…`. The dashboard is server-rendered, so each
 * change re-fetches on the server — `useTransition` keeps the control
 * responsive and shows a pending state while that resolves.
 */
export function TimeframeSelector({ option, from, to }: TimeframeSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [customOpen, setCustomOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(() => {
    const f = toDate(from);
    const t = toDate(to);
    return f || t ? { from: f, to: t } : undefined;
  });

  const navigate = (query: string) => {
    startTransition(() => {
      router.push(`${pathname}?${query}`, { scroll: false });
    });
  };

  const handleSelect = (value: string | null) => {
    if (!value) return;
    const opt = value as TimeframeOption;
    if (opt === "custom") {
      // Seed a valid default window so the dashboard has data to show, then
      // let the user refine it in the popover that opens below.
      const seedFrom = draft?.from ?? subDays(new Date(), 29);
      const seedTo = draft?.to ?? new Date();
      setDraft({ from: seedFrom, to: seedTo });
      navigate(`range=custom&from=${iso(seedFrom)}&to=${iso(seedTo)}`);
      setCustomOpen(true);
      return;
    }
    navigate(`range=${opt}`);
  };

  const applyCustom = () => {
    if (!draft?.from || !draft?.to) return;
    navigate(`range=custom&from=${iso(draft.from)}&to=${iso(draft.to)}`);
    setCustomOpen(false);
  };

  const customLabel =
    from && to
      ? `${format(parseISO(from), "MMM d")} – ${format(parseISO(to), "MMM d, yyyy")}`
      : "Pick dates";

  return (
    <div className="flex items-center gap-2" aria-busy={isPending}>
      <Select value={option} onValueChange={handleSelect}>
        <SelectTrigger
          className="w-[150px]"
          aria-label="Dashboard timeframe"
        >
          <SelectValue>
            {(value: TimeframeOption | null) =>
              value ? TIMEFRAME_LABELS[value] : null
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {TIMEFRAME_OPTIONS.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {TIMEFRAME_LABELS[opt]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {option === "custom" && (
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger
            render={
              <Button variant="outline" size="sm" className="font-normal" />
            }
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {customLabel}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={draft}
              onSelect={setDraft}
              numberOfMonths={2}
              defaultMonth={draft?.from}
              autoFocus
            />
            <div className="flex justify-end gap-2 border-t border-border p-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCustomOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={applyCustom}
                disabled={!draft?.from || !draft?.to}
              >
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
