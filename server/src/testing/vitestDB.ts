import mongoose from "mongoose";

// Mongoose connection is shared across all test suites in the single fork.
// prepareDatabase() connects on first call; subsequent calls are no-ops.
let connected = false;

const prepareDatabase = async (): Promise<void> => {
  if (!connected) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error(
        "MONGODB_URI not set — MongoDB container was not started by globalSetup"
      );
    }
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    });
    connected = true;
  }
};

// No-op: the MongoDB container is started/stopped by vitestGlobalSetup.
// Kept for API compatibility with existing test files.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const disconnectAndStopServer = async (_unused?: unknown): Promise<void> => {
  // intentional no-op
};

export { prepareDatabase, disconnectAndStopServer };
