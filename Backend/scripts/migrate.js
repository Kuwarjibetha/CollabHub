require("dotenv").config();
const { Sequelize } = require("sequelize");

// 1. Connect to Local MySQL
const mysqlDb = new Sequelize("virtual_meeting", "root", "Kuwarji@9934", {
  host: "127.0.0.1",
  port: 3306,
  dialect: "mysql",
  logging: false,
});

// 2. Connect to Supabase PostgreSQL
const supabaseUrl = process.env.DATABASE_URL;
if (!supabaseUrl) {
  console.error("Error: DATABASE_URL is not set in .env!");
  process.exit(1);
}

const pgDb = new Sequelize(supabaseUrl, {
  dialect: "postgres",
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

// 3. Import Models on Postgres
const {
  sequelize,
  User,
  Team,
  TeamMember,
  Message,
  Notification,
  MessageReaction,
  DirectMessage,
} = require("../models");

async function runMigration() {
  try {
    console.log("🔄 Step 1: Authenticating database connections...");
    await mysqlDb.authenticate();
    console.log("  ✅ Local MySQL connected.");

    await sequelize.authenticate();
    console.log("  ✅ Supabase PostgreSQL connected.");

    console.log("\n🔨 Step 2: Creating/Syncing schema in Supabase PostgreSQL...");
    await sequelize.sync();
    console.log("  ✅ Tables created in Supabase PostgreSQL.");

    console.log("\n📦 Step 3: Migrating Data from MySQL -> Supabase PostgreSQL...\n");

    const tablesToMigrate = [
      { name: "Users", model: User, table: "users" },
      { name: "Teams", model: Team, table: "teams" },
      { name: "TeamMembers", model: TeamMember, table: "team_members" },
      { name: "Messages", model: Message, table: "messages" },
      { name: "MessageReactions", model: MessageReaction, table: "message_reactions" },
      { name: "DirectMessages", model: DirectMessage, table: "direct_messages" },
      { name: "Notifications", model: Notification, table: "notifications" },
    ];

    for (const item of tablesToMigrate) {
      process.stdout.write(`  ⏳ Migrating ${item.name}... `);
      const [rows] = await mysqlDb.query(`SELECT * FROM \`${item.table}\`;`);

      if (rows.length === 0) {
        console.log(`0 records found. Skipping.`);
        continue;
      }

      let count = 0;
      for (const row of rows) {
        // Use bulkInsert / upsert using model
        await item.model.upsert(row);
        count++;
      }

      console.log(`✅ ${count} records migrated.`);
    }

    console.log("\n🎉 DATA MIGRATION COMPLETED SUCCESSFULLY!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed with error:", error);
    process.exit(1);
  }
}

runMigration();
