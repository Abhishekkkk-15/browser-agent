import { Browser, BrowserContext, chromium, Page } from "playwright";

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  async start(headless = true, userDataDir?: string) {
    if (userDataDir) {
      this.context = await chromium.launchPersistentContext(userDataDir, {
        headless,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        viewport: { width: 1280, height: 720 },
      });
    } else {
      this.browser = await chromium.launch({ 
        headless,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
      });
    }
  }

  async connect(cdpUrl: string) {
    this.browser = await chromium.connectOverCDP(cdpUrl);
    // When connecting over CDP, there's usually a default context
    this.context = this.browser.contexts()[0] || await this.browser.newContext();
  }

  async newPage(): Promise<Page> {
    if (!this.context) throw new Error("Browser or Context not started");
    return await this.context.newPage();
  }

  async getFirstPage(): Promise<Page> {
    if (!this.context) throw new Error("Browser or Context not started");
    const pages = this.context.pages();
    if (pages.length > 0 && pages[0]) return pages[0];
    return await this.context.newPage();
  }

  async close() {
    if (this.context) {
      await this.context.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }

  getContext() {
    return this.context;
  }
}
