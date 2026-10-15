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
