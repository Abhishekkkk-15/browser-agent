import { Page } from "playwright";

export interface GmailDraft {
  to: string;
  subject: string;
  body: string;
}

export async function composeAndSendEmail(page: Page, draft: GmailDraft) {
  console.log(`Starting to compose email to ${draft.to}...`);

  // Navigate to Gmail if not already there
  if (!page.url().includes("mail.google.com")) {
    await page.goto("https://mail.google.com", { waitUntil: "networkidle" });
  }

  // 1. Click "Compose"
  // Using role and name is usually more robust in Gmail
  await page.getByRole("button", { name: /Compose/i }).click();

  // 2. Wait for the compose window to appear and fill "To"
  await page.getByRole("combobox", { name: /To/i }).fill(draft.to);

  // 3. Fill "Subject"
  await page.getByPlaceholder("Subject").fill(draft.subject);

  // 4. Fill "Body"
  // The body is often a contenteditable div with role="textbox" and aria-label="Message Body"
  await page.getByRole("textbox", { name: /Message Body/i }).fill(draft.body);

  // 5. Click "Send"
  // Note: Standard Gmail send button text is "Send" but aria-label contains the shortcut
  await page.getByRole("button", { name: /Send/i }).click();

  console.log("Email sent successfully!");
}
