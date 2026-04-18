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
  const cdpUrl = process.env.EXISTING_BROWSER_URL || options.cdp;

  if (cdpUrl) {
    console.log(`🔌 Connecting to existing browser at ${cdpUrl}...`);
    await browserManager.connect(cdpUrl);
  } else {
    // Default to headed (visible) unless --headless or HEADLESS=true is set
    const headless = options.headless || process.env.HEADLESS === "true";
    console.log(`🚀 Launching new browser (headless: ${headless})...`);
    const userDataDir =
      options.persist ? path.join(process.cwd(), ".user_data") : undefined;
    await browserManager.start(headless, userDataDir);
  }

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
      if (!options.cdp) await bm.close();
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
      if (!options.cdp) await bm.close();
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
      if (!options.cdp) await bm.close();
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
      if (!options.cdp) await bm.close();
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
      if (!options.cdp) await bm.close();
    }
  });

program.parse(process.argv);
