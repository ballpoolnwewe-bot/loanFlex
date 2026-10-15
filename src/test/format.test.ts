import { describe, expect, it } from "vitest";
import { masa, tarikh } from "../lib/format";

const cases: Record<string, { timestamp: string; shortDate: string; longDate: string }> = {
  "Asia/Jakarta": { timestamp: "15 Okt 2026, 4:10 PTG", shortDate: "15 Okt 2026", longDate: "15 Oktober 2026" },
  "Asia/Kuala_Lumpur": { timestamp: "15 Okt 2026, 5:10 PTG", shortDate: "16 Okt 2026", longDate: "16 Oktober 2026" },
  "America/New_York": { timestamp: "15 Okt 2026, 5:10 PG", shortDate: "15 Okt 2026", longDate: "15 Oktober 2026" },
};
const expected = cases[Intl.DateTimeFormat().resolvedOptions().timeZone];
if (!expected) throw new Error("Run timezone tests with TZ=Asia/Jakarta, Asia/Kuala_Lumpur or America/New_York.");

describe("Client device timezone", () => {
  it("displays timestamps in the client's timezone", () => {
    expect(masa("2026-10-15T09:10:00Z")).toBe(expected.timestamp);
  });
  it("displays the calendar date in the client's timezone", () => {
    expect(tarikh("2026-10-15T16:30:00Z")).toBe(expected.shortDate);
    expect(tarikh("2026-10-15T16:30:00Z", true)).toBe(expected.longDate);
  });
});
