# Daily Operations Email Report — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Send an AI-generated daily email at 4am to opted-in users summarising yesterday's activity across all active jobsites, including crew hours, production, equipment utilization, material shipments, report notes, and a Claude-written assessment of each job.

**Architecture:** A node-cron job runs at 4am in the worker process. It queries MongoDB for all active jobsites, fetches the previous day's daily reports (populating all sub-documents), calculates equipment utilization from existing vehicle/employee work hours, feeds the aggregated data to Claude (claude-haiku-4-5 for cost efficiency), and sends the resulting HTML email via the existing nodemailer utility to all opted-in users. Equipment utilization requires no new data — `VehicleWork.hours` already records operational hours, and shift length is approximated by `max(EmployeeWork.hours)` in a given daily report.

**Tech Stack:** node-cron, Anthropic SDK (`@anthropic-ai/sdk`), Typegoose/Mongoose, nodemailer, Chakra-compatible HTML email template (table-based for email client compatibility).

---

## Background: Equipment Utilization

Equipment utilization = `vehicleWork.hours / shiftLength` per vehicle per daily report, expressed as a percentage.

`shiftLength` = `Math.max(...employeeWork.map(e => e.hours))` — the longest any employee worked that day, which approximates the total time the crew was on site.

This is already fully derivable from existing data. No schema changes to VehicleWork or EmployeeWork are needed.

Example: crew on site 12 hours (max employee hours = 12), paver logged 6 hours → 6/12 = 50% utilization.

---

## Task 1: Add `dailyReportEmail` to UserSettings

**Files:**
- Modify: `server/src/models/User/schema/subdocuments.ts`
- Modify: `server/src/typescript/user.ts` (if UserSettings type is mirrored there)

**Context:** `UserSettings` is an embedded subdocument on `UserSchema` (in `server/src/models/User/schema/index.ts`). It currently holds `homeView` and `subscribedVehicleIssuePriorities`. We add an opt-in boolean here so it lives alongside other user preferences.

**Step 1:** Add the field to `UserSettings` in `subdocuments.ts`:

```typescript
@Field({ nullable: false })
@prop({ required: true, default: false })
public dailyReportEmail!: boolean;
```

**Step 2:** Expose it via the existing `userUpdate` GraphQL mutation. Find the update input type in `server/src/graphql/types/` or `server/src/graphql/resolvers/user/mutations.ts` and add `dailyReportEmail?: boolean` to the settings input.

**Step 3:** In the user update resolver, handle `settings.dailyReportEmail` like the existing `settings.homeView` field.

**Step 4:** Bump `SchemaVersions.User` in `server/src/constants/SchemaVersions.ts` if that pattern is followed for schema changes.

**Step 5:** Commit.

```bash
git add server/src/models/User/schema/subdocuments.ts \
        server/src/graphql/resolvers/user/mutations.ts \
        server/src/constants/SchemaVersions.ts
git commit -m "feat: add dailyReportEmail opt-in to UserSettings"
```

---

## Task 2: Settings UI toggle

**Files:**
- Modify: `client/src/pages/me.tsx` (user profile/settings page)

**Context:** Users need a way to opt in. The `/me` page is where user preferences live. Add a labelled toggle switch using Chakra UI's `Switch` component.

**Step 1:** Add a `Switch` in the settings section of `/me`:

```tsx
import { Switch, FormControl, FormLabel } from "@chakra-ui/react";

<FormControl display="flex" alignItems="center">
  <FormLabel mb={0} fontSize="sm">
    Daily operations email (sent at 4am)
  </FormLabel>
  <Switch
    isChecked={user.settings.dailyReportEmail}
    onChange={(e) =>
      updateSettings({ dailyReportEmail: e.target.checked })
    }
  />
</FormControl>
```

**Step 2:** Wire to the existing user update mutation (run `npm run codegen` in `/client` after the server GraphQL change from Task 1 is live).

**Step 3:** Commit.

```bash
git add client/src/pages/me.tsx
git commit -m "feat: add daily report email opt-in toggle to profile settings"
```

---

## Task 3: Data aggregation utility

**Files:**
- Create: `server/src/utils/dailyOpsReport/aggregateData.ts`

**Context:** This utility queries MongoDB for yesterday's activity across all active jobsites. It returns a structured object per jobsite that is then passed to Claude and the email template. All data is already in MongoDB — this is purely a read/aggregate operation.

**What to collect per jobsite:**
- Jobsite name, jobcode, MongoDB `_id`
- All daily reports for yesterday (a jobsite can have multiple crews)
- Per daily report: crew name, employee list + hours, vehicle list + hours, production entries (quantity, unit, description), material shipments (material name, quantity, supplier), report note text
- Derived: total employee hours, total tonnes produced, equipment utilization per vehicle

**Step 1:** Create the utility:

```typescript
// server/src/utils/dailyOpsReport/aggregateData.ts
import dayjs from "dayjs";
import { Jobsite, DailyReport, EmployeeWork, VehicleWork } from "@models";
import { isDocument } from "@typegoose/typegoose";

export interface VehicleUtilization {
  vehicleName: string;
  operationalHours: number;
  shiftHours: number;
  utilizationPct: number;
}

export interface DailyReportSummary {
  reportId: string;
  crewName: string;
  totalEmployeeHours: number;
  headcount: number;
  employees: { name: string; hours: number }[];
  vehicles: VehicleUtilization[];
  production: { description: string; quantity: number; unit: string }[];
  materialShipments: { material: string; quantity: number; supplier?: string }[];
  reportNote?: string;
}

export interface JobsiteSummary {
  jobsiteId: string;
  jobsiteName: string;
  jobcode?: string;
  reports: DailyReportSummary[];
  totalEmployeeHours: number;
  totalTonnes: number;
  hadActivity: boolean;
}

export async function aggregateDailyOpsData(): Promise<JobsiteSummary[]> {
  const yesterday = dayjs().subtract(1, "day");
  const start = yesterday.startOf("day").toDate();
  const end = yesterday.endOf("day").toDate();

  const activeJobsites = await Jobsite.find({ active: true });
  const summaries: JobsiteSummary[] = [];

  for (const jobsite of activeJobsites) {
    const reports = await DailyReport.find({
      jobsite: jobsite._id,
      date: { $gte: start, $lte: end },
      archived: false,
    })
      .populate("crew")
      .populate({
        path: "employeeWork",
        populate: { path: "employee" },
      })
      .populate({
        path: "vehicleWork",
        populate: { path: "vehicle" },
      })
      .populate({
        path: "production",
      })
      .populate({
        path: "materialShipment",
        populate: { path: "jobsiteMaterial", populate: { path: "material" } },
      })
      .populate("reportNote");

    const reportSummaries: DailyReportSummary[] = reports.map((report) => {
      // Employee hours
      const employeeEntries = (report.employeeWork as any[])
        .filter((ew) => isDocument(ew))
        .map((ew) => ({
          name: isDocument(ew.employee) ? ew.employee.name : "Unknown",
          hours: ew.hours,
        }));
      const totalEmployeeHours = employeeEntries.reduce((s, e) => s + e.hours, 0);
      const shiftHours = employeeEntries.length > 0
        ? Math.max(...employeeEntries.map((e) => e.hours))
        : 0;

      // Vehicle utilization
      const vehicleEntries: VehicleUtilization[] = (report.vehicleWork as any[])
        .filter((vw) => isDocument(vw))
        .map((vw) => ({
          vehicleName: isDocument(vw.vehicle) ? vw.vehicle.name : "Unknown",
          operationalHours: vw.hours,
          shiftHours,
          utilizationPct: shiftHours > 0
            ? Math.round((vw.hours / shiftHours) * 100)
            : 0,
        }));

      // Production
      const productionEntries = (report.production as any[])
        .filter((p) => isDocument(p))
        .map((p) => ({
          description: p.description ?? "",
          quantity: p.quantity,
          unit: p.unit ?? "t",
        }));

      // Material shipments
      const shipmentEntries = (report.materialShipment as any[])
        .filter((ms) => isDocument(ms))
        .map((ms) => ({
          material: isDocument(ms.jobsiteMaterial) && isDocument((ms.jobsiteMaterial as any).material)
            ? (ms.jobsiteMaterial as any).material.name
            : "Unknown",
          quantity: ms.quantity,
          supplier: ms.supplier,
        }));

      const noteDoc = isDocument(report.reportNote) ? report.reportNote : null;

      return {
        reportId: report._id.toString(),
        crewName: isDocument(report.crew) ? report.crew.name : "Unknown Crew",
        totalEmployeeHours,
        headcount: employeeEntries.length,
        employees: employeeEntries,
        vehicles: vehicleEntries,
        production: productionEntries,
        materialShipments: shipmentEntries,
        reportNote: (noteDoc as any)?.note ?? undefined,
      };
    });

    const totalEmployeeHours = reportSummaries.reduce(
      (s, r) => s + r.totalEmployeeHours, 0
    );
    const totalTonnes = reportSummaries.flatMap((r) => r.production)
      .reduce((s, p) => s + p.quantity, 0);

    summaries.push({
      jobsiteId: jobsite._id.toString(),
      jobsiteName: jobsite.name,
      jobcode: jobsite.jobcode ?? undefined,
      reports: reportSummaries,
      totalEmployeeHours,
      totalTonnes,
      hadActivity: reportSummaries.length > 0,
    });
  }

  // Put active jobsites with reports first, then no-activity ones
  return summaries.sort((a, b) =>
    Number(b.hadActivity) - Number(a.hadActivity)
  );
}
```

**Step 2:** Test manually from the playground script (`server/src/playground/index.ts`) by calling `aggregateDailyOpsData()` and logging the result for a known date.

**Step 3:** Commit.

```bash
git add server/src/utils/dailyOpsReport/aggregateData.ts
git commit -m "feat: add daily ops report data aggregation utility"
```

---

## Task 4: AI summary generation

**Files:**
- Create: `server/src/utils/dailyOpsReport/generateSummary.ts`

**Context:** Takes the aggregated jobsite data and calls Claude (Haiku for cost) to write a concise per-jobsite assessment and flag anything that looks problematic. Uses the existing `ANTHROPIC_API_KEY` env var. The prompt should be tuned over time — this is v1.

**Step 1:** Install the Anthropic SDK if not already present in server (check `server/package.json` — it may already be there from the chat router):

```bash
cd server && npm list @anthropic-ai/sdk
```

**Step 2:** Create the utility:

```typescript
// server/src/utils/dailyOpsReport/generateSummary.ts
import Anthropic from "@anthropic-ai/sdk";
import { JobsiteSummary } from "./aggregateData";
import dayjs from "dayjs";

export interface JobsiteWithSummary extends JobsiteSummary {
  aiSummary: string;
  flagged: boolean;
}

export async function generateAISummaries(
  jobsites: JobsiteSummary[]
): Promise<JobsiteWithSummary[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const yesterday = dayjs().subtract(1, "day").format("MMMM D, YYYY");

  const results: JobsiteWithSummary[] = [];

  for (const jobsite of jobsites) {
    if (!jobsite.hadActivity) {
      results.push({
        ...jobsite,
        aiSummary: "No daily report filed for yesterday.",
        flagged: false,
      });
      continue;
    }

    const dataText = JSON.stringify(jobsite, null, 2);

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `You are reviewing yesterday's (${yesterday}) field report for a construction jobsite.

Jobsite data:
${dataText}

Write a concise 2-4 sentence summary of what happened on this jobsite yesterday. Cover:
- How many people were on site and total hours worked
- What was produced (tonnes, if any)
- Equipment utilization highlights (flag anything below 60%)
- Key notes from the foreman (if any)
- Any concerns worth the Operations Manager's attention

End your summary with either "✅ No issues flagged." or "⚠️ Needs attention." based on whether anything looks problematic (low utilization, zero production with crew on site, concerning notes, etc.).

Be direct and specific. Use numbers.`,
        },
      ],
    });

    const text =
      response.content[0]?.type === "text" ? response.content[0].text : "";
    const flagged = text.includes("⚠️");

    results.push({ ...jobsite, aiSummary: text, flagged });
  }

  return results;
}
```

**Step 3:** Commit.

```bash
git add server/src/utils/dailyOpsReport/generateSummary.ts
git commit -m "feat: add Claude AI summary generation for daily ops report"
```

---

## Task 5: HTML email template

**Files:**
- Create: `server/src/utils/dailyOpsReport/emailTemplate.ts`

**Context:** Email clients (Outlook, Gmail) have poor CSS support. Use inline styles and table-based layout. Keep it scannable — flagged jobs at the top, clear section headers per jobsite.

**Step 1:** Create the template function:

```typescript
// server/src/utils/dailyOpsReport/emailTemplate.ts
import dayjs from "dayjs";
import { JobsiteWithSummary } from "./generateSummary";

export function buildEmailHtml(jobsites: JobsiteWithSummary[]): string {
  const yesterday = dayjs().subtract(1, "day").format("MMMM D, YYYY");
  const flagged = jobsites.filter((j) => j.flagged);
  const normal = jobsites.filter((j) => !j.flagged && j.hadActivity);
  const noActivity = jobsites.filter((j) => !j.hadActivity);

  const jobsiteSection = (j: JobsiteWithSummary) => `
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <strong style="font-size: 15px; color: #1a202c;">
                ${j.flagged ? "⚠️ " : ""}${j.jobsiteName}
              </strong>
              ${j.jobcode ? `<span style="color: #718096; font-size: 13px; margin-left: 8px;">${j.jobcode}</span>` : ""}
            </td>
            <td align="right" style="color: #718096; font-size: 13px;">
              ${j.totalEmployeeHours.toFixed(1)} crew hrs &nbsp;|&nbsp; ${j.totalTonnes.toFixed(1)} t
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top: 8px; font-size: 14px; color: #2d3748; line-height: 1.6;">
              ${j.aiSummary.replace(/\n/g, "<br>")}
            </td>
          </tr>
          ${j.reports.flatMap((r) => r.vehicles).some((v) => v.utilizationPct > 0) ? `
          <tr>
            <td colspan="2" style="padding-top: 8px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  ${j.reports.flatMap((r) => r.vehicles).map((v) => `
                    <td style="padding-right: 16px; font-size: 13px; color: ${v.utilizationPct < 60 ? "#c53030" : "#276749"};">
                      ${v.vehicleName}: <strong>${v.utilizationPct}%</strong>
                    </td>
                  `).join("")}
                </tr>
              </table>
            </td>
          </tr>` : ""}
        </table>
      </td>
    </tr>
  `;

  return `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background: #f7fafc; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background: #f7fafc; padding: 24px 0;">
    <tr>
      <td align="center">
        <table width="640" cellpadding="0" cellspacing="0" style="background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: #2b4c7e; padding: 20px 24px; color: white;">
              <strong style="font-size: 18px;">Daily Operations Report</strong>
              <div style="font-size: 13px; opacity: 0.8; margin-top: 4px;">${yesterday}</div>
            </td>
          </tr>

          <!-- Summary bar -->
          <tr>
            <td style="background: #edf2f7; padding: 10px 24px; font-size: 13px; color: #4a5568;">
              ${jobsites.filter((j) => j.hadActivity).length} active jobs &nbsp;·&nbsp;
              ${flagged.length} flagged &nbsp;·&nbsp;
              ${jobsites.reduce((s, j) => s + j.totalEmployeeHours, 0).toFixed(0)} total crew hours &nbsp;·&nbsp;
              ${jobsites.reduce((s, j) => s + j.totalTonnes, 0).toFixed(1)} total tonnes
            </td>
          </tr>

          ${flagged.length > 0 ? `
          <!-- Flagged jobs -->
          <tr>
            <td style="padding: 16px 24px 4px; font-size: 12px; font-weight: bold; color: #c53030; text-transform: uppercase; letter-spacing: 0.05em;">
              Needs Attention
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${flagged.map(jobsiteSection).join("")}
              </table>
            </td>
          </tr>` : ""}

          ${normal.length > 0 ? `
          <!-- Normal jobs -->
          <tr>
            <td style="padding: 16px 24px 4px; font-size: 12px; font-weight: bold; color: #276749; text-transform: uppercase; letter-spacing: 0.05em;">
              Active Jobs
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${normal.map(jobsiteSection).join("")}
              </table>
            </td>
          </tr>` : ""}

          ${noActivity.length > 0 ? `
          <!-- No activity -->
          <tr>
            <td style="padding: 16px 24px 4px; font-size: 12px; font-weight: bold; color: #718096; text-transform: uppercase; letter-spacing: 0.05em;">
              No Report Filed Yesterday
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 16px;">
              ${noActivity.map((j) => `
                <div style="font-size: 13px; color: #718096; padding: 6px 0; border-bottom: 1px solid #f0f0f0;">
                  ${j.jobsiteName}${j.jobcode ? ` (${j.jobcode})` : ""}
                </div>
              `).join("")}
            </td>
          </tr>` : ""}

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px; background: #f7fafc; font-size: 12px; color: #a0aec0; border-top: 1px solid #e2e8f0;">
              Bow Mark Operations · AI summaries generated by Claude · To unsubscribe, update your profile settings.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
```

**Step 2:** Commit.

```bash
git add server/src/utils/dailyOpsReport/emailTemplate.ts
git commit -m "feat: add HTML email template for daily ops report"
```

---

## Task 6: Main report sender utility

**Files:**
- Create: `server/src/utils/dailyOpsReport/index.ts`

**Context:** Orchestrates the three steps: aggregate data → generate AI summaries → build email → send to all opted-in users.

**Step 1:**

```typescript
// server/src/utils/dailyOpsReport/index.ts
import { User } from "@models";
import email from "@utils/email";
import dayjs from "dayjs";
import { aggregateDailyOpsData } from "./aggregateData";
import { generateAISummaries } from "./generateSummary";
import { buildEmailHtml } from "./emailTemplate";

export async function sendDailyOpsReport(): Promise<void> {
  console.log("[dailyOpsReport] Starting daily ops report generation...");

  // Find all opted-in users
  const recipients = await User.find({ "settings.dailyReportEmail": true });
  if (recipients.length === 0) {
    console.log("[dailyOpsReport] No opted-in users, skipping.");
    return;
  }

  const jobsiteData = await aggregateDailyOpsData();
  const withSummaries = await generateAISummaries(jobsiteData);
  const html = buildEmailHtml(withSummaries);

  const yesterday = dayjs().subtract(1, "day").format("MMMM D, YYYY");
  const subject = `Daily Operations Report — ${yesterday}`;
  const flaggedCount = withSummaries.filter((j) => j.flagged).length;
  const subjectWithFlag = flaggedCount > 0
    ? `⚠️ ${flaggedCount} job${flaggedCount > 1 ? "s" : ""} flagged — ${subject}`
    : subject;

  for (const user of recipients) {
    await email.sendEmail(user.email, subjectWithFlag, html);
  }

  console.log(
    `[dailyOpsReport] Sent to ${recipients.length} recipient(s). ` +
    `${flaggedCount} jobsite(s) flagged.`
  );
}
```

**Step 2:** Commit.

```bash
git add server/src/utils/dailyOpsReport/index.ts
git commit -m "feat: add daily ops report orchestration"
```

---

## Task 7: Cron job in worker process

**Files:**
- Modify: `server/src/workers/index.ts`
- Install: `node-cron` + `@types/node-cron`

**Context:** The worker process already runs as a separate k8s deployment (see `k8s-dev/` and `k8s/` yamls — `APP_TYPE=worker`). The cron runs at 4am local time. `node-cron` is the standard choice.

**Step 1:** Install the dependency:

```bash
cd server && npm install node-cron && npm install -D @types/node-cron
```

**Step 2:** Add the cron to `workers/index.ts`:

```typescript
import cron from "node-cron";
import { sendDailyOpsReport } from "@utils/dailyOpsReport";

// Inside the workers() function, after existing workers:
// Run daily ops report at 4:00am every day
cron.schedule("0 4 * * *", async () => {
  try {
    await sendDailyOpsReport();
  } catch (e) {
    console.error("[dailyOpsReport] Cron error:", e);
  }
});

console.log("[workers] Daily ops report cron scheduled for 4:00am.");
```

**Step 3:** Verify the timezone. The cron runs in the server's system timezone (set by the k8s node/container). If the DO cluster is UTC, 4am UTC = midnight ET — wrong. Adjust the cron expression or set `TZ=America/Toronto` in the k8s deployment env. Check existing deployments for timezone config and match.

**Step 4:** Commit.

```bash
git add server/src/workers/index.ts server/package.json server/package-lock.json
git commit -m "feat: schedule daily ops report cron at 4am in worker process"
```

---

## Task 8: Manual trigger for testing

**Files:**
- Modify: `server/src/playground/index.ts`

**Context:** Before deploying, you'll want to trigger the report manually to verify the email looks right and Claude's summaries are sensible. The playground is the existing one-off script runner.

**Step 1:** Add to playground:

```typescript
import { sendDailyOpsReport } from "@utils/dailyOpsReport";

// Temporarily call this and run: npx ts-node -r tsconfig-paths/register src/playground/index.ts
await sendDailyOpsReport();
```

**Step 2:** Run it and inspect the received email. Adjust the Claude prompt in `generateSummary.ts` as needed.

**Step 3:** Revert the playground change before committing.

---

## Key Decisions & Future Tuning

- **Claude model:** Haiku for cost efficiency (~$0.001-0.003 per daily run depending on jobsite count). Upgrade to Sonnet if summaries need improvement.
- **Flagging threshold:** Currently based on Claude's judgment. If false positives are common, add explicit rules (e.g. flag if `utilizationPct < 50` for a tracked piece of equipment) alongside the AI assessment.
- **Equipment utilization display:** The email shows utilization per vehicle in red (<60%) or green (≥60%). The 60% threshold is a starting point — adjust based on what the OM considers normal.
- **No-report handling:** Jobsites with no daily report filed are listed separately — the OM may want to follow up with foremen on those.
- **Timezone:** Must be confirmed before go-live. `TZ=America/Toronto` in the worker deployment env is the likely fix.
- **MCP server:** Consider also exposing a `get_equipment_utilization` tool in the MCP server so the chat assistant can answer utilization questions. The calculation logic in `aggregateData.ts` can be extracted and reused.
