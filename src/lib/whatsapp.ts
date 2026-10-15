// Nombor WhatsApp khidmat pelanggan (format antarabangsa, digit sahaja).
export const WA_NOMBOR = "6289682765529";

export const waLink = (mesej?: string) =>
  `https://wa.me/${WA_NOMBOR}${mesej ? `?text=${encodeURIComponent(mesej)}` : ""}`;

// ID transaksi: TRX + DDMMYYYY + 4 digit rawak, cth. TRX151020264821
export const janaIdTransaksi = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, "0");
  const rawak = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `TRX${p(d.getDate())}${p(d.getMonth() + 1)}${d.getFullYear()}${rawak}`;
};

// 00:00–09:59 pagi · 10:00–14:59 siang · 15:00–17:59 sore · 18:00–23:59 malam
export const salamMasa = (d = new Date()) => {
  const j = d.getHours();
  if (j < 10) return "Selamat pagi";
  if (j < 15) return "Selamat siang";
  if (j < 18) return "Selamat sore";
  return "Selamat malam";
};