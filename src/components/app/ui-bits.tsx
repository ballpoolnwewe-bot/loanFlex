import type { ReactNode } from "react";
import { Loader2, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import markImg from "@/assets/mark.png";

export function Lencana({ peta, status }: { peta: Record<string, { label: string; tone: string }>; status: string }) {
  const s = peta[status] ?? { label: status, tone: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", s.tone)}>
      <span className="size-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

export function Logo({ terang = false }: { terang?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <img src={markImg} alt="" className="size-9 rounded-xl bg-card object-contain p-0.5" />
      <span className={cn("font-display text-lg font-bold tracking-tight", terang ? "text-navy-foreground" : "text-navy")}>
        Ringgit<span className="text-accent">Flex</span>
      </span>
    </span>
  );
}

export function Memuatkan({ teks = "Memuatkan..." }: { teks?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="size-5 animate-spin text-primary" /> {teks}
    </div>
  );
}

export function Kosong({ tajuk, mesej, aksi }: { tajuk: string; mesej?: string; aksi?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary">
        <Inbox className="size-6" />
      </span>
      <p className="font-display font-semibold">{tajuk}</p>
      {mesej && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{mesej}</p>}
      {aksi && <div className="mt-4">{aksi}</div>}
    </div>
  );
}

export function Stat({ label, nilai, ikon, nota, tone = "primary" }: { label: string; nilai: ReactNode; ikon: ReactNode; nota?: ReactNode; tone?: "primary" | "accent" | "warning" | "navy" }) {
  const t = { primary: "bg-primary/10 text-primary", accent: "bg-accent/15 text-success", warning: "bg-warning/20 text-warning-foreground", navy: "bg-navy/10 text-navy" }[tone];
  return (
    <div className="surface animate-rise p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className={cn("flex size-9 items-center justify-center rounded-xl [&_svg]:size-4.5", t)}>{ikon}</span>
      </div>
      <p className="mt-3 font-display text-2xl font-bold tracking-tight">{nilai}</p>
      {nota && <p className="mt-1 text-xs text-muted-foreground">{nota}</p>}
    </div>
  );
}

export function Bar({ nilai }: { nilai: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
      <div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, nilai))}%` }} />
    </div>
  );
}

export function Baris({ label, nilai }: { label: string; nilai: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{nilai}</span>
    </div>
  );
}
