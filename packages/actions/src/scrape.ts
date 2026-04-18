import { Page } from "playwright";

export async function scrapeText(page: Page, selector: string): Promise<string[]> {
  const elements = await page.$$(selector);
  const results: string[] = [];
  for (const element of elements) {
    const text = await element.innerText();
    results.push(text.trim());
  }
  return results;
}

export async function scrapeAllContent(page: Page): Promise<string> {
  // Simplified text extraction of the whole body
  return await page.innerText("body");
}
