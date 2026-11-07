import type { MeterProps } from "./Meter.types";
import {
  meterFillClasses,
  meterGeometry,
  meterNoteClasses,
} from "./meterGeometry";

export function Meter(props: MeterProps) {
  const {
    label,
    max = 100,
    note,
    ofText,
    tone = "finance",
    value,
    valueText,
  } = props;
  const geometry = meterGeometry(props);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-body-s text-ink">{label}</span>
        <span className="whitespace-nowrap text-body-s font-semibold tabular-nums text-ink">
          {valueText}
          {ofText ? (
            <span className="font-normal text-ink-muted"> {ofText}</span>
          ) : null}
        </span>
      </div>
      <div
        aria-label={label}
        aria-valuemax={max}
        aria-valuemin={0}
        aria-valuenow={value}
        className="relative h-2 rounded-xs bg-surface-sunken ring-1 ring-line ring-inset"
        role="meter"
      >
        <div
          className={`absolute inset-y-0 left-0 origin-left animate-grow rounded-xs motion-reduce:animate-none ${meterFillClasses[tone]}`}
          style={{ width: `${geometry.fill}%` }}
        />
        {geometry.target === undefined ? null : (
          <div
            className="absolute -inset-y-[3px] w-0.5 rounded-[1px] bg-ink"
            style={{ left: `calc(${geometry.target}% - 1px)` }}
            title="Target"
          />
        )}
      </div>
      {note ? (
        <span className={`text-caption ${meterNoteClasses[tone]}`}>{note}</span>
      ) : null}
    </div>
  );
}
