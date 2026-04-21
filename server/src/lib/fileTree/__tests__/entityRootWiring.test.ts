import { prepareDatabase, disconnectAndStopServer } from "@testing/vitestDB";
import seedDatabase, { SeededDatabase } from "@testing/seedDatabase";
import { Tender, Jobsite, DailyReport, FileNode } from "@models";
import { bootstrapRoots } from "@lib/fileTree/bootstrapRoots";

let docs: SeededDatabase;

beforeAll(async () => {
  await prepareDatabase();
  await bootstrapRoots();
  docs = await seedDatabase();
});
afterAll(async () => {
  await disconnectAndStopServer();
});

describe("entity creation provisions reserved root", () => {
  it("Tender.createDocument provisions /tenders/<id>/", async () => {
    const tender = await Tender.createDocument({
      name: "wiring-test-tender",
      jobcode: "T-WIRE-1",
      createdBy: "000000000000000000000001",
    });

    const fileNode = await FileNode.findOne({
      name: tender._id.toString(),
      isReservedRoot: true,
    }).lean();
    expect(fileNode).not.toBeNull();

    const tendersNs = await FileNode.findOne({
      name: "tenders",
      isReservedRoot: true,
    }).lean();
    expect(fileNode?.parentId?.toString()).toBe(tendersNs!._id.toString());
  });

  it("Jobsite.createDocument provisions /jobsites/<id>/", async () => {
    const jobsite = await Jobsite.createDocument({
      name: "wiring-test-jobsite",
      jobcode: "J-WIRE-1",
    });

    const fileNode = await FileNode.findOne({
      name: jobsite._id.toString(),
      isReservedRoot: true,
    }).lean();
    expect(fileNode).not.toBeNull();

    const jobsitesNs = await FileNode.findOne({
      name: "jobsites",
      isReservedRoot: true,
    }).lean();
    expect(fileNode?.parentId?.toString()).toBe(jobsitesNs!._id.toString());
  });

  it("DailyReport.createDocument provisions /daily-reports/<id>/", async () => {
    const jobsite = docs.jobsites.jobsite_1;
    const crew = docs.crews.base_1;

    const dailyReport = await DailyReport.createDocument({
      jobsite,
      crew,
      date: new Date("2099-12-31"),
    });

    const fileNode = await FileNode.findOne({
      name: dailyReport._id.toString(),
      isReservedRoot: true,
    }).lean();
    expect(fileNode).not.toBeNull();

    const drNs = await FileNode.findOne({
      name: "daily-reports",
      isReservedRoot: true,
    }).lean();
    expect(fileNode?.parentId?.toString()).toBe(drNs!._id.toString());
  });
});
