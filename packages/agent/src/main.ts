#!/usr/bin/env bun
import { Command } from "commander";
import * as dotenv from "dotenv";
import * as path from "path";
import { BrowserManager } from "@browser-agent/core";
import {
  scrapeAllContent,
  composeAndSendEmail,
  clickElement,
  fillElement,
  waitForElement,
  takeScreenshot,
} from "@browser-agent/actions";
import { runScrapeToGmail } from "@browser-agent/workflows";
import { AutonomousAgent } from "./autonomous";

dotenv.config({ path: path.join(__dirname, "../../../.env") });

const program = new Command();

program
  .name("browser-agent")
  .description("CLI for advanced browser automation tasks")
  .version("1.0.0");

async function setupBrowser(options: any) {
  const browserManager = new BrowserManager();
  const autoConnect = process.env.AUTO_CONNECT !== "false";
  const headless = options.headless || process.env.HEADLESS === "true";
  const userDataDir =
    options.persist ? path.join(process.cwd(), ".user_data") : undefined;

  await browserManager.setupSmartConnection({
    cdpUrl: process.env.EXISTING_BROWSER_URL || options.cdp,
    autoConnect,
    headless,
    userDataDir,
  });

  return browserManager;
}

program
  .command("scrape")
  .description("Scrape text content from a given URL")
  .argument("<url>", "URL to scrape")
  .option("-c, --cdp <url>", "Connect to existing browser CDP URL")
  .option("--headless", "Run browser in headless mode", false)
  .action(async (url, options) => {
    const bm = await setupBrowser(options);
    try {
      const page = await bm.getFirstPage();
      console.log(`Navigating to ${url}...`);
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const content = await scrapeAllContent(page);
      console.log("\n--- Scraped Content ---\n");
      console.log(
        content.substring(0, 1000) +
          (content.length > 1000 ? "\n... (truncated)" : "")
      );
    } finally {
      await bm.close();
    }
  });

program
  .command("gmail")
  .description("Automate sending an email via Gmail")
  .requiredOption("-t, --to <email>", "Recipient email address")
  .requiredOption("-s, --subject <text>", "Email subject")
  .requiredOption("-b, --body <text>", "Email body")
  .option("-c, --cdp <url>", "Connect to existing browser CDP URL")
  .option("--headless", "Run browser in headless mode", false)
  .option("--persist", "Persist session data", true)
  .action(async (options) => {
    const bm = await setupBrowser(options);
    try {
      const page = await bm.getFirstPage();
      await composeAndSendEmail(page, {
        to: options.to,
        subject: options.subject,
        body: options.body,
      });
    } finally {
      await bm.close();
    }
  });

program
  .command("interactive")
  .description(
    "Open a browser session and interact manually, then press Enter to close"
  )
  .option("-c, --cdp <url>", "Connect to existing browser CDP URL")
  .option("--persist", "Persist session data", true)
  .action(async (options) => {
    const bm = await setupBrowser({ ...options, headless: false });
    try {
      const page = await bm.getFirstPage();
      await page.goto("https://google.com");

      console.log("Browser is open. Press Enter to close it.");
      await new Promise<void>((resolve) => {
        process.stdin.once("data", () => resolve());
      });
    } finally {
      await bm.close();
    }
  });

program
  .command("scrape-to-gmail")
  .description("Run the full scrape-to-gmail workflow")
  .argument("<url>", "URL to scrape")
  .requiredOption("-t, --to <email>", "Recipient email address")
  .option("-s, --subject <text>", "Email subject", "Automated Scrape Results")
  .option("-c, --cdp <url>", "Connect to existing browser CDP URL")
  .option("--headless", "Run browser in headless mode", false)
  .option("--persist", "Persist session data", true)
  .action(async (url, options) => {
    const bm = await setupBrowser(options);
    try {
      const page = await bm.getFirstPage();
      await runScrapeToGmail({
        sourceUrl: url,
        emailTo: options.to,
        emailSubject: options.subject,
        // page, // Pass the already opened page
        userDataDir:
          options.persist ? path.join(process.cwd(), ".user_data") : undefined,
        headless: options.headless || process.env.HEADLESS === "true",
      });
    } finally {
      await bm.close();
    }
  });

program
  .command("autonomous")
  .description("Run the agent in fully autonomous mode")
  .argument("<goal>", "Goal for the agent to achieve")
  .option("-c, --cdp <url>", "Connect to existing browser CDP URL")
  .option("--headless", "Run browser in headless mode", false)
  .action(async (goal, options) => {
    const bm = await setupBrowser(options);
    try {
      const page = await bm.getFirstPage();
      const agent = new AutonomousAgent({
        openaiApiKey: process.env.OPENAI_API_KEY || "",
      });
      const result = await agent.run(page, goal);
      console.log("\n✅ Task Complete Result:\n", result);
    } finally {
      await bm.close();
    }
  });

program
  .command("doctor")
  .description("Diagnose browser connection issues")
  .action(async () => {
    console.log("👨‍⚕️ Browser Agent Doctor - Diagnostic Report\n");

    const ports = [9222];
    const hosts = ["127.0.0.1", "localhost"];

    for (const host of hosts) {
      for (const port of ports) {
        const url = `http://${host}:${port}/json/version`;
        console.log(`🔍 Checking ${url}...`);
        try {
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ FOUND: Browser is listening on ${host}:${port}`);
            console.log(`📦 Version: ${data.Browser}`);
            console.log(`🌐 WebSocker URL: ${data.webSocketDebuggerUrl}`);
            console.log("\n🎉 Connection test passed! Your agent should be able to connect.");
            return;
          }
        } catch (e: any) {
          console.log(`❌ Failed: ${e.message}`);
        }
      }
    }

    console.log("\n🛑 DIAGNOSIS: Connection Refused");
    console.log("The agent cannot find your running Chrome instance.");
    console.log("\nFIX STEPS:");
    console.log("1. Close ALL Chrome windows. Check your Task Manager for hidden 'chrome.exe' processes.");
    console.log("2. Open your System Tray (bottom right) and exit any Chrome icons there.");
    console.log("3. Run 'launch_chrome_debug.bat' again after all processes are killed.");
    console.log("4. If the issue persists, try running this command in PowerShell as Admin: taskkill /F /IM chrome.exe /T");
    console.log("5. Run this 'doctor' command again.");
  });

program.parse(process.argv);
