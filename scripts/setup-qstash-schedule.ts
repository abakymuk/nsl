/**
 * Setup script to create QStash schedule for PortPro polling
 * Run with: npx tsx scripts/setup-qstash-schedule.ts
 */

import { Client } from "@upstash/qstash";

if (!process.env.QSTASH_TOKEN) {
  console.error("❌ QSTASH_TOKEN environment variable is required");
  process.exit(1);
}

const client = new Client({
  token: process.env.QSTASH_TOKEN,
});

async function setupSchedule() {
  try {
    // Create schedule for every 5 minutes
    const schedule = await client.schedules.create({
      destination: "https://newstreamlogistics.com/api/qstash/portpro-poll",
      cron: "*/5 * * * *",
    });

    console.log("✅ QStash schedule created successfully!");
    console.log("Schedule ID:", schedule.scheduleId);
    console.log("Cron: Every 5 minutes");
    console.log("Destination: https://newstreamlogistics.com/api/qstash/portpro-poll");
  } catch (error) {
    console.error("❌ Failed to create schedule:", error);
  }
}

setupSchedule();
