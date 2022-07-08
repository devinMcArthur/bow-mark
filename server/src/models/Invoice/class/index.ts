import { InvoiceDocument, InvoiceModel } from "@models";
import { IInvoiceCreate, IInvoiceUpdate } from "@typescript/invoice";
import { GetByIDOptions, Id } from "@typescript/models";
import { ObjectType } from "type-graphql";
import { InvoiceSchema } from "../schema";
import create from "./create";
import get from "./get";
import remove from "./remove";
import update from "./update";

@ObjectType()
export class InvoiceClass extends InvoiceSchema {
  /**
   * ----- GET -----
   */

  public static async getById(
    this: InvoiceModel,
    id: Id,
    options?: GetByIDOptions
  ) {
    return get.byId(this, id, options);
  }

  public async getCompany(this: InvoiceDocument) {
    return get.company(this);
  }

  /**
   * ----- Create -----
   */

  public static async createDocument(this: InvoiceModel, data: IInvoiceCreate) {
    return create.document(this, data);
  }

  /**
   * ----- Update -----
   */

  public async updateDocument(this: InvoiceDocument, data: IInvoiceUpdate) {
    return update.document(this, data);
  }

  /**
   * ----- Remove -----
   */

  public async removeDocument(this: InvoiceDocument) {
    return remove.document(this);
  }
}
