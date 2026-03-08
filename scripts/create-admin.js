const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function createAdmin() {
  // 1. Create user in auth.users (auto-confirmed, no email verification)
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: "admin@daddesfund.com",
      password: "Admin123!",
      email_confirm: true,
      user_metadata: { display_name: "Admin" },
    });

  if (authError) {
    console.error("Auth error:", authError.message);
    process.exit(1);
  }

  console.log("User created:", authData.user.id);

  // 2. Promote to admin in profiles table
  const { data, error } = await supabase
    .from("profiles")
    .update({ role: "admin", display_name: "Admin" })
    .eq("id", authData.user.id)
    .select()
    .single();

  if (error) {
    console.error("Profile update error:", error.message);
    process.exit(1);
  }

  console.log("\n=== Admin Account Created ===");
  console.log("Email:    admin@daddesfund.com");
  console.log("Password: Admin123!");
  console.log("Role:     admin");
  console.log("User ID: ", authData.user.id);
}

createAdmin();
