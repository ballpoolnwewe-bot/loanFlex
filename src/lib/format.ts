export const rm = (n: number | string | null | undefined) =>
  new Intl.NumberFormat("ms-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 2 }).format(
    Number(n ?? 0),
  );

export const tarikh = (d: string | Date | null | undefined, panjang = false) =>
  d
    ? new Date(d).toLocaleDateString("ms-MY", panjang ? { dateStyle: "long" } : { day: "numeric", month: "short", year: "numeric" })
    : "-";

export const masa = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("ms-MY", { dateStyle: "medium", timeStyle: "short" }) : "-";

export function ralatMesej(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "Ralat tidak dijangka. Sila cuba lagi.";
}

export const STATUS_PERMOHONAN: Record<string, { label: string; tone: string }> = {
  menunggu: { label: "Menunggu", tone: "bg-warning/15 text-warning-foreground" },
  disemak: { label: "Sedang Disemak", tone: "bg-primary/10 text-primary" },
  lulus: { label: "Diluluskan", tone: "bg-success/15 text-success" },
  ditolak: { label: "Ditolak", tone: "bg-destructive/10 text-destructive" },
  dibatalkan: { label: "Dibatalkan", tone: "bg-muted text-muted-foreground" },
  selesai: { label: "Selesai", tone: "bg-secondary text-secondary-foreground" },
};

export const STATUS_PINJAMAN: Record<string, { label: string; tone: string }> = {
  menunggu_pencairan: { label: "Menunggu Pencairan", tone: "bg-warning/15 text-warning-foreground" },
  aktif: { label: "Aktif", tone: "bg-primary/10 text-primary" },
  selesai: { label: "Selesai", tone: "bg-success/15 text-success" },
  ditolak: { label: "Pencairan Ditolak", tone: "bg-destructive/10 text-destructive" },
};

export const STATUS_TRANSAKSI: Record<string, { label: string; tone: string }> = {
  menunggu: { label: "Menunggu", tone: "bg-warning/15 text-warning-foreground" },
  berjaya: { label: "Berjaya", tone: "bg-success/15 text-success" },
  gagal: { label: "Gagal", tone: "bg-destructive/10 text-destructive" },
  dibatalkan: { label: "Dibatalkan", tone: "bg-muted text-muted-foreground" },
};

export const BANK = [
  "Maybank", "CIMB Bank", "Public Bank", "RHB Bank", "Hong Leong Bank", "AmBank",
  "Bank Islam", "Bank Rakyat", "BSN", "Affin Bank", "Alliance Bank", "OCBC Bank", "UOB", "HSBC", "Standard Chartered",
];
