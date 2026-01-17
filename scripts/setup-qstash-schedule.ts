/**
 * Setup script to create QStash schedule for PortPro polling
 * Run with: npx tsx scripts/setup-qstash-schedule.ts
 */

import { Client } from "@upstash/qstash";

const client = new Client({
  token: process.env.QSTASH_TOKEN || "eyJVc2VySUQiOiI1YTBkMzMxYy0xYmNkLTQyZWItOGVjMC1lOGQxMWQ4ZDc5MWMiLCJQYXNzd29yZCI6ImQxOTA3MzdmNzE2NzQ2MWZiNWM3OWNjOWQ4NWU5ZmU4In0=",
});

async function setupSchedule() {
  try {
    // Create schedule for every 5 minutes
    const schedule = await client.schedules.create({
      destination: "https://www.newstream-logistics.com/api/qstash/portpro-poll",
      cron: "*/5 * * * *",
    });

    console.log("✅ QStash schedule created successfully!");
    console.log("Schedule ID:", schedule.scheduleId);
    console.log("Cron: Every 5 minutes");
    console.log("Destination: https://www.newstream-logistics.com/api/qstash/portpro-poll");
  } catch (error) {
    console.error("❌ Failed to create schedule:", error);
  }
}

setupSchedule();
