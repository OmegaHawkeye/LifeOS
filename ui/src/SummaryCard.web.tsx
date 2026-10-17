import type { SummaryCardProps } from "./SummaryCard.types";

export function SummaryCard({ title, detail }: SummaryCardProps) {
  return (
    <section className="min-h-[132px] w-full flex-1 rounded-md border border-line bg-surface p-5 shadow-raised md:w-[47%]">
      <h2 className="text-title-m text-ink">{title}</h2>
      <p className="mt-3 text-body-s text-ink-muted">{detail}</p>
    </section>
  );
}
