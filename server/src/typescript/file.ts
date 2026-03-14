import { Types } from "mongoose";
import { Readable } from "stream";

export enum SupportedMimeTypes {
  PNG = "image/png",
  JPEG = "image/jpeg",
  GIF = "image/gif",
  PDF = "application/pdf",
  XLS = "application/vnd.ms-excel",
  XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  DOC = "application/msword",
  DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

export interface IFileCreate {
  _id?: Types.ObjectId;
  stream: Readable;
  mimetype: string;
  description?: string;
}
