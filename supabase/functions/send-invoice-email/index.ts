// ═══════════════════════════════════════════════════════════════
// Supabase Edge Function: send-invoice-email
// ─────────────────────────────────────────────────────────────
// Fungsi ini jadi "perantara" antara browser dan Resend API.
// Browser TIDAK BISA manggil api.resend.com langsung (CORS block),
// jadi browser manggil Edge Function ini (yang boleh dipanggil dari
// browser), lalu Edge Function ini yang manggil Resend dari sisi
// server (Deno runtime, bukan browser — jadi CORS tidak berlaku).
//
// CARA DEPLOY (via Dashboard, tanpa install apapun):
// 1. Buka dashboard.supabase.com → project kamu
// 2. Sidebar kiri → Edge Functions → Deploy a new function
// 3. Pilih "Via Editor" (bukan AI Assistant)
// 4. Nama function: send-invoice-email
// 5. Hapus semua kode default, paste seluruh isi file ini
// 6. Klik Deploy
// 7. Setelah deploy, buka tab "Secrets" di Edge Functions
//    → tambahkan secret: RESEND_API_KEY = re_xxxxxxxxx (API key Resend kamu)
// ═══════════════════════════════════════════════════════════════

// @ts-ignore - Deno import, valid di runtime Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, toName, subject, html, fromEmail, fromName } = await req.json();

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: "Field 'to', 'subject', dan 'html' wajib diisi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // @ts-ignore - Deno global, valid di runtime Supabase
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY belum di-set di Supabase Secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName || "WildanInvoice"} <${fromEmail || "onboarding@resend.dev"}>`,
        to: [to],
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      return new Response(
        JSON.stringify({ error: resendData.message || "Gagal kirim email via Resend", detail: resendData }),
        { status: resendRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
