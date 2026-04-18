import { Page } from "playwright";
import * as path from "path";

export async function clickElement(page: Page, selector: string) {
  console.log(`Clicking element: ${selector}`);
  await page.locator(selector).click();
}

export async function fillElement(page: Page, selector: string, value: string) {
  console.log(`Filling element: ${selector} with value: ${value}`);
  await page.locator(selector).fill(value);
}

export async function waitForElement(page: Page, selector: string) {
  console.log(`Waiting for element: ${selector}`);
  await page.locator(selector).waitFor();
}

export async function takeScreenshot(page: Page, filename: string) {
  const filepath = path.resolve(process.cwd(), filename);
  console.log(`Taking screenshot: ${filepath}`);
  await page.screenshot({ path: filepath, fullPage: true });
  return filepath;
}
