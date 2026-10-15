import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, LayoutDashboard, FilePlus2, Wallet, CreditCard, History, ShieldCheck, LogOut, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNotifikasi, useSaya } from "@/lib/data";
import { Logo } from "./ui-bits";
import { masa } from "@/lib/format";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Utama", ikon: LayoutDashboard },
  { to: "/mohon", label: "Mohon", ikon: FilePlus2 },
  { to: "/pinjaman", label: "Pinjaman", ikon: Wallet },
  { to: "/pembayaran", label: "Bayaran", ikon: CreditCard },
  { to: "/riwayat", label: "Riwayat", ikon: History },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { data: saya } = useSaya();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const keluar = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/dashboard"><Logo /></Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                activeProps={{ className: "bg-secondary !text-primary" }}>
                {n.label}
              </Link>
            ))}
            {saya?.admin && (
              <Link to="/admin" className="rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary" activeProps={{ className: "bg-navy !text-navy-foreground" }}>
                Admin
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-2">
            <Loceng />
            <button onClick={keluar} className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-destructive" aria-label="Log keluar">
              <LogOut className="size-4" /> <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:py-10">{children}</main>

      <nav className="fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-2xl border border-border bg-card/95 p-1.5 shadow-glow backdrop-blur md:hidden">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium text-muted-foreground"
            activeProps={{ className: "bg-secondary !text-primary" }}>
            <n.ikon className="size-5" /> {n.label}
          </Link>
        ))}
        {saya?.admin && (
          <Link to="/admin" className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium text-muted-foreground" activeProps={{ className: "bg-navy !text-navy-foreground" }}>
            <ShieldCheck className="size-5" /> Admin
          </Link>
        )}
      </nav>
    </div>
  );
}

function Loceng() {
  const { data } = useNotifikasi();
  const qc = useQueryClient();
  const [buka, setBuka] = useState(false);
  const belum = (data ?? []).filter((n) => !n.dibaca);
  const tandaSemua = async () => {
    const ids = belum.map((n) => n.id);
    if (!ids.length) return;
    await supabase.from("notifikasi").update({ dibaca: true }).in("id", ids);
    qc.invalidateQueries({ queryKey: ["notifikasi"] });
  };
  return (
    <Popover open={buka} onOpenChange={setBuka}>
      <PopoverTrigger asChild>
        <button className="relative flex size-10 items-center justify-center rounded-full border border-border transition hover:bg-secondary" aria-label="Notifikasi">
          <Bell className="size-4.5" />
          {belum.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
              {belum.length > 9 ? "9+" : belum.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-1.5rem)] rounded-2xl p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-display font-semibold">Notifikasi</p>
          <button onClick={tandaSemua} className="flex items-center gap-1 text-xs font-medium text-primary"><CheckCheck className="size-3.5" /> Tanda dibaca</button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {(data ?? []).length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">Tiada notifikasi lagi.</p>}
          {(data ?? []).map((n) => (
            <a key={n.id} href={n.pautan ?? "#"} onClick={() => setBuka(false)}
              className={cn("block border-b border-border/60 px-4 py-3 transition hover:bg-secondary/60", !n.dibaca && "bg-primary/5")}>
              <p className="flex items-center gap-2 text-sm font-semibold">{!n.dibaca && <span className="size-2 rounded-full bg-accent" />}{n.tajuk}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{n.mesej}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{masa(n.created_at)}</p>
            </a>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
