import "reflect-metadata";
import path from "path";
import * as dotenv from "dotenv";

// Setup environment variables
const production = process.env.NODE_ENV === "production";
if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
  dotenv.config({ path: path.join(__dirname, "..", ".env.development") });
}

import mongoose from "mongoose";
import createApp from "./app";
import updateDocuments from "@utils/updateDocuments";
import { Company, System } from "@models";
import elasticsearch from "./elasticsearch";
import workers from "@workers";

// import saveAll from "@testing/saveAll";

const main = async () => {
  try {
    if (process.env.NODE_ENV !== "test" && process.env.MONGO_URI) {
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("MongoDB Connected");

      if (!production) {
        // await seedDatabase();
      }
    }

    await elasticsearch();

    const port = process.env.PORT || 8080;

    const app = await createApp();

    app.listen(port, () => console.log(`Server running on port: ${port}`));

    if (process.env.NODE_ENV !== "test") {
      if (production) {
        // await saveAll();
      } else {
        // await saveAll([], "es");
      }

      await System.validateSystem();
      await Company.validateCompanies();

      await updateDocuments();

      workers();
    }
  } catch (error: unknown) {
    console.error(error);
  }
};

main().catch((err) => console.error(err));
