import getBuffer from "@utils/getBuffer";
import AWS from "aws-sdk";
import { ReadStream } from "fs";

const client = () => {
  return new AWS.S3({
    endpoint: new AWS.Endpoint(
      `${process.env.SPACES_REGION}.digitaloceanspaces.com`
    ),
    accessKeyId: process.env.SPACES_KEY,
    secretAccessKey: process.env.SPACES_SECRET,
  });
};

const uploadFile = async (name: string, body: ReadStream, mimetype: string) => {
  const buffer = await getBuffer(body);

  return new Promise((resolve, reject) => {
    if (!process.env.SPACES_NAME) throw new Error("Must provide SPACES_NAME");

    client().putObject(
      {
        Bucket: process.env.SPACES_NAME,
        Key: name,
        Body: buffer,
        ACL: "private",
        ContentType: mimetype,
      },
      (err, data) => {
        if (err) reject(err.message);
        else resolve(data);
      }
    );
  });
};

const getFile = async (
  name: string
): Promise<AWS.S3.GetObjectOutput | null> => {
  return new Promise((resolve, reject) => {
    if (!process.env.SPACES_NAME) reject(new Error("Must provide SPACES_NAME"));

    client().getObject(
      {
        Bucket: process.env.SPACES_NAME || "",
        Key: name,
      },
      (err, data) => {
        if (err) reject(err);
        else resolve(data);
      }
    );
  });
};

const removeFile = (name: string) => {
  return new Promise((resolve, reject) => {
    if (!process.env.SPACES_NAME) reject(new Error("Must provide SPACES_NAME"));

    client().deleteObject(
      {
        Bucket: process.env.SPACES_NAME || "",
        Key: name,
      },
      (err, data) => {
        if (err) reject(err.message);
        else resolve(data);
      }
    );
  });
};

export { uploadFile, getFile, removeFile };
