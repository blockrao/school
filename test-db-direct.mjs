import { createClient } from "./node_modules/@supabase/supabase-js/dist/module/index.js";

const url = "https://ybevzpryuvgxclkhdjld.supabase.co";
const key = "sb_publishable_yt3485ddlGNINtKjWr2FiQ_p_hzCc0m";

const client = createClient(url, key, {
  auth: { persistSession: false },
  db: { schema: "api" },
});

console.log("Testing api.public_areas view...");

try {
  const { data, error } = await client
    .from("public_areas")
    .select("slug,state_slug,is_launch,school_count")
    .eq("state_slug", "haryana")
    .limit(5);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Result:", JSON.stringify(data, null, 2));
    console.log(`Found ${data?.length || 0} areas`);
  }
} catch (err) {
  console.error("Exception:", err);
}
