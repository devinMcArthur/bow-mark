import { S3 } from "@aws-sdk/client-s3";

const client = new S3({
  endpoint: `https://${process.env.SPACES_REGION}.digitaloceanspaces.com`,
  // region is set in endpoint, must use AWS region for proper functioning
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.SPACES_KEY || "",
    secretAccessKey: process.env.SPACES_SECRET || "",
  },
});

export default client;
