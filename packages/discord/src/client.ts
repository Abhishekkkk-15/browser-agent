import { Client, GatewayIntentBits, Message } from "discord.js";
import * as dotenv from "dotenv";
import * as path from "path";
import { AutonomousAgent } from "../../agent/src/autonomous";
import { BrowserManager } from "@browser-agent/core";

dotenv.config({ path: path.join(__dirname, "../../../.env") });

export class DiscordBot {
  private client: Client;
  private agent: AutonomousAgent;
  private browserManager: BrowserManager;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.agent = new AutonomousAgent({
      openaiApiKey: process.env.OPENAI_API_KEY || "",
    });

    this.browserManager = new BrowserManager();
  }

  async start() {
    this.client.on("ready", () => {
      console.log(`Logado como ${this.client.user?.tag}!`);
    });

    this.client.on("messageCreate", async (message: Message) => {
      if (message.author.bot) return;
      if (!message.content.startsWith("!agent ")) return;

      const goal = message.content.replace("!agent ", "");
      await message.reply("🤖 Submitting task to agent: " + goal);

      try {
        await this.browserManager.setupSmartConnection({
          cdpUrl: process.env.EXISTING_BROWSER_URL,
          autoConnect: process.env.AUTO_CONNECT !== "false",
          headless: process.env.HEADLESS === "true",
        });

        const page = await this.browserManager.getFirstPage();
        const result = await this.agent.run(page, goal);

        await message.reply("✅ Task Complete:\n" + result);
      } catch (error: any) {
        console.error(error);
        await message.reply("❌ Error: " + error.message);
      } finally {
        await this.browserManager.close();
      }
    });

    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      throw new Error("DISCORD_BOT_TOKEN not found in environment variables.");
    }

    await this.client.login(token);
  }
}

// If run directly
if (require.main === module) {
  new DiscordBot().start().catch(console.error);
}
