import { Browser, chromium } from "playwright";

export class BrowserManager {
  private browser: Browser | null = null;

  async start(headless = true) {
    this.browser = await chromium.launch({ headless });
  }
  async newPage() {
    if (!this.browser) throw new Error("Browser not started");
    return await this.browser.newPage();
  }
  async close() {
    await this.browser?.close();
  }
}

async function run() {
  const bm = new BrowserManager();
  console.log("got here");
  await bm.start(false);
  await bm.newPage();
  // await bm.close();
  console.log("done");
}

run();
