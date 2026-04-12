import { Browser, chromium } from "playwright";

export class BroswerManager {
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
