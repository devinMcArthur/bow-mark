import { Types } from "mongoose";
import { Readable } from "stream";

export enum SupportedMimeTypes {
  PNG = "image/png",
  JPEG = "image/jpeg",
  GIF = "image/gif",
  PDF = "application/pdf",
  XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}

export interface IFileCreate {
  _id?: Types.ObjectId;
  stream: Readable;
  mimetype: string;
  description?: string;
}
