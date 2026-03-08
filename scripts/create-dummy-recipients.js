/**
 * Create dummy recipient users in Supabase for showcasing instant payouts.
 * Each user gets an Interledger test wallet address.
 *
 * Usage:  node scripts/create-dummy-recipients.js
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const RECIPIENTS = [
  { name: "Alice Tan",      email: "alice@demo.daddesfund.com",   wallet: "https://ilp.interledger-test.dev/bro1" },
  { name: "Bob Lee",        email: "bob@demo.daddesfund.com",     wallet: "https://ilp.interledger-test.dev/bro2" },
  { name: "Charlie Ng",     email: "charlie@demo.daddesfund.com", wallet: "https://ilp.interledger-test.dev/bro3" },
  { name: "Diana Lim",      email: "diana@demo.daddesfund.com",   wallet: "https://ilp.interledger-test.dev/bro4" },
  { name: "Ethan Wong",     email: "ethan@demo.daddesfund.com",   wallet: "https://ilp.interledger-test.dev/bro5" },
  { name: "Fiona Chua",     email: "fiona@demo.daddesfund.com",   wallet: "https://ilp.interledger-test.dev/bro6" },
  { name: "George Ong",     email: "george@demo.daddesfund.com",  wallet: "https://ilp.interledger-test.dev/bro7" },
  { name: "Hannah Koh",     email: "hannah@demo.daddesfund.com",  wallet: "https://ilp.interledger-test.dev/bro8" },
  { name: "Isaac Yeo",      email: "isaac@demo.daddesfund.com",   wallet: "https://ilp.interledger-test.dev/bro9" },
  { name: "Julia Sim",      email: "julia@demo.daddesfund.com",   wallet: "https://ilp.interledger-test.dev/bro11" },
];

async function createRecipients() {
  console.log("Creating dummy recipient users…\n");

  let created = 0;
  let skipped = 0;

  for (const r of RECIPIENTS) {
    // 1. Create auth user (auto-confirmed, trigger creates profile + preferences)
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: r.email,
        password: "Demo1234!",
        email_confirm: true,
        user_metadata: {
          display_name: r.name,
          wallet_address: r.wallet,
        },
      });

    if (authError) {
      if (authError.message.includes("already been registered")) {
        console.log(`⏭  ${r.name} (${r.email}) — already exists, updating wallet…`);

        // Look up existing user and update wallet
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users?.users?.find((u) => u.email === r.email);
        if (existingUser) {
          await supabase
            .from("profiles")
            .update({ wallet_address: r.wallet, display_name: r.name })
            .eq("id", existingUser.id);
          console.log(`   ✅ Updated wallet for ${r.name}`);
        }
        skipped++;
        continue;
      }
      console.error(`❌ ${r.name}: ${authError.message}`);
      continue;
    }

    // 2. Update profile with wallet address (trigger may or may not set it)
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        wallet_address: r.wallet,
        display_name: r.name,
      })
      .eq("id", authData.user.id);

    if (profileError) {
      console.error(`   ⚠️  Profile update for ${r.name}: ${profileError.message}`);
    }

    console.log(`✅ ${r.name}  |  ${r.email}  |  ${r.wallet}`);
    created++;
  }

  console.log(`\n=== Done: ${created} created, ${skipped} skipped (already existed) ===`);
  console.log("Password for all demo users: Demo1234!");
}

createRecipients().catch(console.error);
