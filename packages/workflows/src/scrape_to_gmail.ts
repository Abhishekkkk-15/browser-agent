import { BrowserManager } from "@browser-agent/core";
import { scrapeAllContent, composeAndSendEmail, GmailDraft } from "@browser-agent/actions";

export interface ScrapeToGmailOptions {
  sourceUrl: string;
  emailTo: string;
  emailSubject: string;
  userDataDir?: string;
  headless?: boolean;
}

export async function runScrapeToGmail(options: ScrapeToGmailOptions) {
  const browserManager = new BrowserManager();
  
  try {
    // 1. Start Browser
    await browserManager.start(options.headless ?? false, options.userDataDir);
    const page = await browserManager.newPage();

    // 2. Scrape Source
    console.log(`Navigating to ${options.sourceUrl}...`);
    await page.goto(options.sourceUrl, { waitUntil: "networkidle" });
    const scrapedText = await scrapeAllContent(page);
    console.log("Scraping complete.");

    // 3. Prepare Gmail Draft
    const draft: GmailDraft = {
      to: options.emailTo,
      subject: options.emailSubject,
      body: `Here is the content scraped from ${options.sourceUrl}:\n\n${scrapedText}`,
    };

    // 4. Send via Gmail
    await composeAndSendEmail(page, draft);

    console.log("Workflow completed successfully!");
  } catch (error) {
    console.error("Workflow failed:", error);
    throw error;
  } finally {
    await browserManager.close();
  }
}
