import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || "BVC@2026!";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing environment variables.");
  console.error("Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function readUsers() {
  const csv = fs.readFileSync("office_users.csv", "utf8").trim();
  const lines = csv.split(/\r?\n/);
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => (row[h] = (values[i] || "").trim()));
    return row;
  });
}

async function listAllUsers() {
  const users = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...(data.users || []));
    if (!data.users || data.users.length < perPage) break;
    page++;
  }

  return users;
}

async function main() {
  const inputUsers = readUsers();
  console.log(`Loaded ${inputUsers.length} users from office_users.csv`);

  const existingUsers = await listAllUsers();
  const existingByEmail = new Map(
    existingUsers.map((u) => [(u.email || "").toLowerCase(), u])
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const person of inputUsers) {
    const email = person.email.toLowerCase();
    let authUser = existingByEmail.get(email);

    if (!authUser) {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: {
          full_name: person.full_name,
          designation: person.designation,
          role: person.role,
        },
      });

      if (error) {
        console.error(`FAILED creating ${email}: ${error.message}`);
        skipped++;
        continue;
      }

      authUser = data.user;
      existingByEmail.set(email, authUser);
      created++;
      console.log(`Created: ${email}`);
    } else {
      console.log(`Already exists: ${email}`);
    }

    const { error: profileError } = await supabase.from("employee_profiles").upsert(
      {
        user_id: authUser.id,
        full_name: person.full_name,
        official_email: email,
        designation: person.designation,
        role: person.role,
        status: "Active",
      },
      { onConflict: "user_id" }
    );

    if (profileError) {
      console.error(`FAILED profile upsert ${email}: ${profileError.message}`);
      skipped++;
      continue;
    }

    updated++;
  }

  console.log("\nBulk user creation completed.");
  console.log(`Created auth users: ${created}`);
  console.log(`Profiles inserted/updated: ${updated}`);
  console.log(`Skipped/errors: ${skipped}`);
  console.log(`Default password used: ${DEFAULT_PASSWORD}`);
  console.log("Ask all users to change password after first login.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
