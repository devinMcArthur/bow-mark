// Mock for @modelcontextprotocol/sdk (ESM-only, incompatible with Jest CommonJS)
export class Client {
  connect() { return Promise.resolve(); }
  listTools() { return Promise.resolve({ tools: [] }); }
  close() { return Promise.resolve(); }
}

export class StreamableHTTPClientTransport {
  constructor(_url: URL) {}
}
