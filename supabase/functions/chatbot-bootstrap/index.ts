import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Built-in Penny app quick commands (always available to logged-in users)
const PENNY_COMMANDS = [
  { id: "p_orders", label: "My recent orders", prompt: "Show my recent orders" },
  { id: "p_track", label: "Track my last order", prompt: "What is the status of my latest order?" },
  { id: "p_wallet", label: "My wallet balance", prompt: "What is my wallet balance and how can I use it?" },
  { id: "p_referral", label: "My referral code", prompt: "What is my referral code and how does the referral bonus work?" },
  { id: "p_prime", label: "About Penny Prime", prompt: "Explain Penny Prime benefits and how to join." },
  { id: "p_flash", label: "Today's flash sales", prompt: "What flash sales are running right now?" },
  { id: "p_delivery", label: "Delivery charges", prompt: "How are delivery charges calculated for my area?" },
];

function normalizeMobile(raw: string): string {
  let s = String(raw || "").replace(/\D/g, "");
  if (s.startsWith("91") && s.length > 10) s = s.slice(2);
  s = s.replace(/^0+/, "");
  if (s.length > 10) s = s.slice(-10);
  return s;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Identify user
    let userId: string | null = null;
    let mobile: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
      userId = claims?.claims?.sub ?? null;
      if (userId) {
        const { data: profile } = await sb
          .from("profiles")
          .select("mobile_number")
          .eq("user_id", userId)
          .maybeSingle();
        mobile = profile?.mobile_number ? normalizeMobile(profile.mobile_number) : null;
      }
    }

    // Read chatbot config
    const { data: cfgRows } = await sb.from("chatbot_config").select("key, value");
    const cfg: Record<string, string | null> = {};
    (cfgRows ?? []).forEach((r: any) => { cfg[r.key] = r.value; });

    const elifeEnabled = cfg.elife_enabled === "true";
    const allowedTables = (cfg.elife_allowed_tables || "").split(",").map((s) => s.trim()).filter(Boolean);

    // Check agent status against e-Life
    let isAgent = false;
    let agentInfo: { name?: string; mobile?: string; source?: string } | null = null;
    let elifeCommands: any[] = [];

    if (elifeEnabled && mobile && mobile.length === 10) {
      const elifeUrl = Deno.env.get("ELIFE_SUPABASE_URL");
      const elifeKey = Deno.env.get("ELIFE_SUPABASE_SERVICE_ROLE_KEY");
      if (elifeUrl && elifeKey) {
        const elife = createClient(elifeUrl, elifeKey);
        const variants = Array.from(new Set([mobile, `91${mobile}`, `0${mobile}`]));

        const probes: { table: string; cols: string[] }[] = [
          { table: "pennyekart_agents", cols: ["mobile"] },
          { table: "members", cols: ["mobile", "mobile_number", "phone", "whatsapp_number"] },
        ];

        outer: for (const p of probes) {
          if (allowedTables.length && !allowedTables.includes(p.table)) continue;
          for (const col of p.cols) {
            for (const v of variants) {
              const { data, error } = await elife.from(p.table).select("*").eq(col, v).limit(1);
              if (error) break;
              if (data && data.length) {
                isAgent = true;
                agentInfo = {
                  name: data[0].name || data[0].full_name || null,
                  mobile,
                  source: p.table,
                };
                break outer;
              }
            }
          }
        }

        // Pull active WhatsApp commands for the menu (only if agent + table allowed)
        if (isAgent && (!allowedTables.length || allowedTables.includes("whatsapp_bot_commands"))) {
          const { data: cmds } = await elife
            .from("whatsapp_bot_commands")
            .select("keyword, alt_keyword, label, response_text, sort_order")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .limit(30);
          elifeCommands = (cmds ?? []).map((c: any, i: number) => ({
            id: `e_${i}`,
            label: c.label || c.keyword,
            keyword: c.keyword,
            // Prompt the bot to actually run this command for the agent
            prompt: `Run e-Life WhatsApp command "${c.keyword}"${c.label ? ` (${c.label})` : ""} for my account (mobile ${mobile}). If it requires details, ask me.`,
          }));
        }
      }
    }

    return new Response(
      JSON.stringify({
        loggedIn: !!userId,
        mobile,
        isAgent,
        agentInfo,
        elifeEnabled,
        pennyCommands: userId ? PENNY_COMMANDS : [],
        elifeCommands,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("chatbot-bootstrap error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
