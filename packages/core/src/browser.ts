import { Browser, BrowserContext, chromium, Page } from "playwright";

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private isExternalBrowser = false;

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

  /**
   * Smartly setup browser connection:
   * 1. If cdpUrl is provided, try connecting.
   * 2. If autoConnect is true, try connecting to default CDP (127.0.0.1:9222).
   * 3. Fallback to starting a new browser instance.
   */
  async setupSmartConnection(options: {
    cdpUrl?: string;
    autoConnect?: boolean;
    headless?: boolean;
    userDataDir?: string;
  } = {}) {
    const { cdpUrl, autoConnect = true, headless = true, userDataDir } = options;
    const targetCdp = cdpUrl || (autoConnect ? "http://127.0.0.1:9222" : undefined);

    if (targetCdp) {
      try {
        console.log(`🔌 Attempting to connect to existing browser at ${targetCdp}...`);
        await this.connect(targetCdp);
        this.isExternalBrowser = true;
        console.log("✅ Successfully connected to existing browser.");
        return;
      } catch (error: any) {
        if (cdpUrl) {
          throw new Error(`Failed to connect to explicitly provided CDP URL: ${cdpUrl}. Error: ${error.message}`);
        }
        console.log(`❌ Connection to ${targetCdp} failed: ${error.message}`);
        
        // Try localhost if 127.0.0.1 failed
        if (targetCdp.includes("127.0.0.1")) {
          const localhostCdp = targetCdp.replace("127.0.0.1", "localhost");
          try {
            console.log(`🔌 Retrying with ${localhostCdp}...`);
            await this.connect(localhostCdp);
            this.isExternalBrowser = true;
            console.log("✅ Successfully connected to existing browser via localhost.");
            return;
          } catch (retryError: any) {
            console.log(`❌ Connection to ${localhostCdp} failed: ${retryError.message}`);
          }
        }
        
        console.log("\n⚠️  TROUBLESHOOTING: Could not connect to your existing browser.");
        console.log("1. Ensure you ran 'launch_chrome_debug.bat'.");
        console.log("2. Ensure ALL other Chrome windows were closed before running the script.");
        console.log("3. Try running 'pnpm run agent doctor' to diagnose the connection.\n");
        console.log("ℹ️ Falling back to a fresh Chromium instance...");
      }
    }

    await this.start(headless, userDataDir);
    this.isExternalBrowser = false;
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
    if (this.isExternalBrowser) {
      console.log("ℹ️ External browser detected. Disconnecting without closing remote instance.");
      this.context = null;
      this.browser = null;
      return;
    }

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
