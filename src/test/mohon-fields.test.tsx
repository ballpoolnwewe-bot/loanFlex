import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: { component: ComponentType }) => options,
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  useNavigate: () => vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock("@/lib/data", () => ({
  useKelayakan: () => ({ data: { boleh: true }, isLoading: false }),
  useSaya: () => ({ data: { user: { id: "test-user" }, profil: {} }, isLoading: false }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn(), storage: {} } }));
import { Route } from "../routes/_authenticated/mohon";

describe("Isian pekerjaan dan kontak darurat", () => {
  it("menampilkan alamat pekerjaan dan enam pilihan, tanpa nama majikan", () => {
    const Form = (Route as unknown as { component: ComponentType }).component;
    render(<Form />);
    expect(screen.queryByLabelText(/Nama majikan/i)).not.toBeInTheDocument();
    const alamat = screen.getByLabelText("Alamat pekerjaan");
    fireEvent.change(alamat, { target: { value: "25 Jalan Sekolah, Kuala Lumpur" } });
    expect(alamat).toHaveValue("25 Jalan Sekolah, Kuala Lumpur");
    expect(screen.getAllByRole("combobox")).toHaveLength(6);
    fireEvent.keyDown(screen.getByLabelText("Industri pekerjaan / bidang"), { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("option", { name: "Pendidikan" }));
    expect(screen.getByLabelText("Industri pekerjaan / bidang")).toHaveTextContent("Pendidikan");
    for (const hubungan of screen.getAllByLabelText("Hubungan")) {
      fireEvent.keyDown(hubungan, { key: "ArrowDown" });
      fireEvent.click(screen.getByRole("option", { name: "Ibu", exact: true }));
      expect(hubungan).toHaveTextContent("Ibu");
    }
  });
});