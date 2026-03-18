import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const prepareDatabase = async () => {
  const mongoServer = new MongoMemoryServer();
  const mongoUri = await mongoServer.getUri();
  await mongoose.connect(
    mongoUri,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
    },
    (err) => {
      if (err) console.error(err);
    }
  );

  return mongoServer;
};

// Disconnect mongoose and stop server
const disconnectAndStopServer = async (mongoServer: MongoMemoryServer) => {
  await mongoose.disconnect();
  await mongoServer.stop();

  return mongoServer;
};

export { prepareDatabase, disconnectAndStopServer };
