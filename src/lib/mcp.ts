import { google } from "@ai-sdk/google";
import { experimental_createMCPClient as createMCPClient, streamText } from "ai";

// this is an example of how to create a client for the MCP (Multi-Channel Protocol)
// and how to use it with ai SDK

const mcpClient = await createMCPClient({
  transport: {
    type: "sse",
    url: "https://my-server.com/sse",

    // optional: configure HTTP headers, e.g. for authentication
    headers: {
      Authorization: "Bearer my-api-key",
    },
  },
});


const tools = await mcpClient.tools();

streamText({
  experimental_telemetry: { isEnabled: true },
  model: google("gemini-2.0-flash-001"),
  tools,
  prompt: "What is the weather in Brooklyn, New York?",
  onFinish: async () => {
    await mcpClient.close();
  },
});
