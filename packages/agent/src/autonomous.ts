import { Page } from "playwright";
import OpenAI from "openai";
import { getSimplifiedPageStructure } from "@browser-agent/core";
import { fillElement, clickElement } from "@browser-agent/actions";

export interface AgentConfig {
  openaiApiKey: string;
  model?: string;
}

export class AutonomousAgent {
  private openai: OpenAI;
  private model: string;

  constructor(config: AgentConfig) {
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
      baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    });
    this.model = process.env.OPENAI_MODEL || config.model || "gpt-4o";
  }

  async run(page: Page, goal: string) {
    let step = 0;
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are an autonomous browser agent. Your goal is: ${goal}

Instructions:
1. You interact with the page using numeric element IDs provided in the structure.
2. Available actions:
   - click(id): Click the element with the given ID.
   - fill(id, value): Type text into the input with the given ID.
   - goto(url): Navigate to a new URL.
   - wait(ms): Wait for a number of milliseconds.
   - success(result): Goal achieved.

Respond ONLY with a JSON object:
{
  "thought": "Your reasoning here",
  "action": "actionName",
  "params": { ... }
}`,
      },
    ];

    while (step < 10) {
      step++;

      console.log(`\n--- Step ${step} ---`);
      console.log(`🔍 Analyzing page structure...`);
      const pageStructure = await getSimplifiedPageStructure(page);
      const url = page.url();

      messages.push({
        role: "user",
        content: `Current URL: ${url}\nInteractive Elements:\n${pageStructure}\n\nWhat is your next action?`,
      });

      console.log(`🧠 Agent is thinking (Model: ${this.model})...`);
      const startTime = Date.now();
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        response_format: { type: "json_object" },
      });
      const endTime = Date.now();

      const completion = response?.choices[0]?.message.content || "{}";
      const usage = response.usage;

      if (usage) {
        console.log(
          `📊 Token Usage: Prompt: ${usage.prompt_tokens}, Completion: ${usage.completion_tokens}, Total: ${usage.total_tokens}`
        );
      }
      console.log(
        `⏱️ Thinking time: ${((endTime - startTime) / 1000).toFixed(2)}s`
      );

      try {
        const result = JSON.parse(completion);
        console.log(`🤖 Thought: ${result.thought}`);

        if (result.action === "success") {
          return result.params?.result || "Goal achieved.";
        }

        console.log(
          `🚀 Executing action: ${result.action} on ${JSON.stringify(result.params)}...`
        );
        await this.executeAction(page, result.action, result.params);

        // Add the agent's thought to message history
        messages.push({ role: "assistant", content: completion });
      } catch (e: any) {
        console.error("❌ Failed to parse or execute action:", e.message);
        messages.push({
          role: "system",
          content: `Error: ${e.message}. Please correct your action.`,
        });
      }
    }

    return "Max steps reached without success.";
  }

  private async executeAction(page: Page, action: string, params: any) {
    switch (action) {
      case "goto":
        await page.goto(params.url, { waitUntil: "domcontentloaded" });
        // Small wait after navigation to let basic JS run
        await page.waitForTimeout(1000);
        break;
      case "click":
        await clickElement(page, `[data-agent-id='${params.id}']`);
        break;
      case "fill":
        await fillElement(page, `[data-agent-id='${params.id}']`, params.value);
        break;
      case "wait":
        await page.waitForTimeout(params.ms || 1000);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }
}
