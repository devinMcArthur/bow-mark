import { Resolver, Query, Arg, ID } from "type-graphql";
import mongoose from "mongoose";
import { FileNode } from "@models";
import { FileNodeSchema } from "../../../models/FileNode/schema";

@Resolver()
export default class FileNodeResolver {
  @Query(() => FileNodeSchema, { nullable: true })
  async fileNode(
    @Arg("id", () => ID) id: string
  ): Promise<FileNodeSchema | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const node = await FileNode.findOne({ _id: id, deletedAt: null }).lean();
    return (node as FileNodeSchema | null) ?? null;
  }

  @Query(() => [FileNodeSchema])
  async fileNodeChildren(
    @Arg("parentId", () => ID) parentId: string
  ): Promise<FileNodeSchema[]> {
    if (!mongoose.isValidObjectId(parentId)) return [];
    const children = await FileNode.find({
      parentId: new mongoose.Types.ObjectId(parentId),
      deletedAt: null,
    })
      .sort({ sortKey: 1, name: 1 })
      .lean();
    return children as FileNodeSchema[];
  }

  @Query(() => [FileNodeSchema])
  async fileNodeBreadcrumbs(
    @Arg("id", () => ID) id: string
  ): Promise<FileNodeSchema[]> {
    if (!mongoose.isValidObjectId(id)) return [];

    // Walk upward via $graphLookup starting at the target, connecting parentId.
    const result = await FileNode.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $graphLookup: {
          from: "filenodes",
          startWith: "$parentId",
          connectFromField: "parentId",
          connectToField: "_id",
          as: "ancestors",
          depthField: "depth",
        },
      },
    ]);

    if (result.length === 0) return [];
    const self = result[0];
    const ancestors = (self.ancestors ?? []) as Array<
      FileNodeSchema & { depth: number }
    >;
    // ancestors[] from $graphLookup are unordered; sort by depth DESCENDING so
    // higher depth numbers (closer to root) come first.
    ancestors.sort((a, b) => b.depth - a.depth);
    const selfNoAncestors: FileNodeSchema = { ...self };
    // Strip the ancestors field so the returned `self` node matches the schema.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (selfNoAncestors as any).ancestors;
    return [
      ...ancestors.map((a) => {
        const { depth: _depth, ...rest } = a;
        return rest as FileNodeSchema;
      }),
      selfNoAncestors,
    ];
  }
}
