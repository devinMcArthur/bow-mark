import { ReadStream } from "fs";
import { Types } from "mongoose";

export enum SupportedMimeTypes {
  PNG = "image/png",
  JPEG = "image/jpeg",
  GIF = "image/gif",
}

export interface IFileCreate {
  _id?: Types.ObjectId;
  stream: ReadStream;
  mimetype: string;
  description?: string;
}