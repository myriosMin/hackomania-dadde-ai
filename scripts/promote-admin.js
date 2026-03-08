const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function promoteAdmin() {
  // Find user by email
  const { data: users, error: listError } =
    await supabase.auth.admin.listUsers();

  if (listError) {
    console.error("List error:", listError.message);
    process.exit(1);
  }

  const adminUser = users.users.find((u) => u.email === "admin@daddesfund.com");
  if (!adminUser) {
    console.error("User admin@daddesfund.com not found in auth.users");
    process.exit(1);
  }

  console.log("Found user:", adminUser.id, adminUser.email);

  // Promote in profiles table
  const { data, error } = await supabase
    .from("profiles")
    .update({ role: "admin", display_name: "Admin" })
    .eq("id", adminUser.id)
    .select()
    .single();

  if (error) {
    console.error("Profile update error:", error.message);
    // Maybe the trigger hasn't created the profile row yet — try inserting
    const { data: ins, error: insErr } = await supabase
      .from("profiles")
      .upsert({
        id: adminUser.id,
        email: "admin@daddesfund.com",
        display_name: "Admin",
        role: "admin",
      })
      .select()
      .single();
    if (insErr) {
      console.error("Upsert error:", insErr.message);
      process.exit(1);
    }
    console.log("Profile upserted:", ins.role);
  } else {
    console.log("Profile updated:", data.role);
  }

  console.log("\n=== Admin Account Ready ===");
  console.log("Email:    admin@daddesfund.com");
  console.log("Password: Admin123!");
  console.log("Role:     admin");
}

promoteAdmin();
