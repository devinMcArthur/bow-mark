import { MaterialDocument } from "@models";

export interface IMaterialCreate {
  name: string;
}

export interface IMaterialUpdate {
  name: string;
}

export interface IMaterialSearchObject {
  score: number;
  material: MaterialDocument;
}
