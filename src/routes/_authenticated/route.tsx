import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    // Keputusan baharu yang belum dilihat sentiasa diutamakan sebelum halaman lain.
    if (location.pathname !== "/keputusan" && !location.pathname.startsWith("/admin")) {
      const { data: belum } = await supabase
        .from("permohonan")
        .select("id")
        .eq("user_id", data.user.id)
        .in("status", ["lulus", "ditolak"])
        .eq("keputusan_dilihat", false)
        .limit(1);
      if (belum && belum.length > 0) throw redirect({ to: "/keputusan" });
    }
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
