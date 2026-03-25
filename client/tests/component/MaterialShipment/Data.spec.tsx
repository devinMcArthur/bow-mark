import { expect, test } from "@playwright/experimental-ct-react17";
import React from "react";
import MaterialShipmentDataForm from "../../../src/components/Forms/MaterialShipment/Data";
import {
  hourlyTruckingRate,
  invoiceMaterial,
  legacyMaterial,
  makeFormData,
  quantityTruckingRate,
  rateMaterial,
} from "../fixtures/materials";

const baseProps = {
  canDelete: false,
  isLoading: false,
  dailyReportDate: new Date("2024-01-15"),
  errors: undefined,
  remove: () => {},
  onChange: () => {},
};

// ── Legacy material ────────────────────────────────────────────────────────

test.describe("Legacy material", () => {
  test("shows vehicle section", async ({ mount }) => {
    const component = await mount(
      <MaterialShipmentDataForm
        {...baseProps}
        formData={makeFormData(legacyMaterial._id)}
        jobsiteMaterials={[legacyMaterial]}
        truckingRates={[quantityTruckingRate]}
      />
    );
    // Check the "VEHICLE" section divider — unique text that only renders with the vehicle section
    await expect(component.getByText("Vehicle", { exact: true })).toBeVisible();
    await expect(component.getByText("Vehicle Source")).toBeVisible();
    await expect(component.getByText("Vehicle Code")).toBeVisible();
  });

  test("does not show scenario picker", async ({ mount }) => {
    const component = await mount(
      <MaterialShipmentDataForm
        {...baseProps}
        formData={makeFormData(legacyMaterial._id)}
        jobsiteMaterials={[legacyMaterial]}
        truckingRates={[quantityTruckingRate]}
      />
    );
    await expect(component.getByText("Rate Scenario")).not.toBeVisible();
  });

  test("shows start/end time fields", async ({ mount }) => {
    const component = await mount(
      <MaterialShipmentDataForm
        {...baseProps}
        formData={makeFormData(legacyMaterial._id)}
        jobsiteMaterials={[legacyMaterial]}
        truckingRates={[quantityTruckingRate]}
      />
    );
    await expect(component.getByText("Start Time (optional)")).toBeVisible();
    await expect(component.getByText("End Time (optional)")).toBeVisible();
  });
});

// ── Invoice model ──────────────────────────────────────────────────────────

test.describe("Invoice model", () => {
  test("shows Invoice badge", async ({ mount }) => {
    const component = await mount(
      <MaterialShipmentDataForm
        {...baseProps}
        formData={makeFormData(invoiceMaterial._id)}
        jobsiteMaterials={[invoiceMaterial]}
        truckingRates={[quantityTruckingRate]}
      />
    );
    // exact: true distinguishes the badge ("Invoice") from the callout ("Invoiced material…")
    await expect(component.getByText("Invoice", { exact: true })).toBeVisible();
  });

  test("shows info callout", async ({ mount }) => {
    const component = await mount(
      <MaterialShipmentDataForm
        {...baseProps}
        formData={makeFormData(invoiceMaterial._id)}
        jobsiteMaterials={[invoiceMaterial]}
        truckingRates={[quantityTruckingRate]}
      />
    );
    await expect(
      component.getByText("Invoiced material — enter quantity only.")
    ).toBeVisible();
  });

  test("hides vehicle section", async ({ mount }) => {
    const component = await mount(
      <MaterialShipmentDataForm
        {...baseProps}
        formData={makeFormData(invoiceMaterial._id)}
        jobsiteMaterials={[invoiceMaterial]}
        truckingRates={[quantityTruckingRate]}
      />
    );
    await expect(component.getByText("Vehicle Source")).not.toBeVisible();
  });

  test("hides start/end time fields", async ({ mount }) => {
    const component = await mount(
      <MaterialShipmentDataForm
        {...baseProps}
        formData={makeFormData(invoiceMaterial._id)}
        jobsiteMaterials={[invoiceMaterial]}
        truckingRates={[quantityTruckingRate]}
      />
    );
    await expect(
      component.getByText("Start Time (optional)")
    ).not.toBeVisible();
  });
});

// ── Rate model — pickup scenario ───────────────────────────────────────────

test.describe("Rate model — pickup scenario", () => {
  test("shows scenario picker with both scenarios", async ({ mount }) => {
    const component = await mount(
      <MaterialShipmentDataForm
        {...baseProps}
        formData={makeFormData(rateMaterial._id, { scenarioId: "s-pickup" })}
        jobsiteMaterials={[rateMaterial]}
        truckingRates={[quantityTruckingRate]}
      />
    );
    await expect(component.getByText("Rate Scenario")).toBeVisible();
    // Target the scenario card buttons specifically (not the vehicle type <option>)
    await expect(component.getByRole("button", { name: /^Pickup/ })).toBeVisible();
    await expect(component.getByRole("button", { name: /^Tandem/ })).toBeVisible();
  });

  test("shows vehicle section", async ({ mount }) => {
    const component = await mount(
      <MaterialShipmentDataForm
        {...baseProps}
        formData={makeFormData(rateMaterial._id, { scenarioId: "s-pickup" })}
        jobsiteMaterials={[rateMaterial]}
        truckingRates={[quantityTruckingRate]}
      />
    );
    await expect(component.getByText("Vehicle", { exact: true })).toBeVisible();
    await expect(component.getByText("Vehicle Source")).toBeVisible();
    await expect(component.getByText("Vehicle Code")).toBeVisible();
  });

  test("hides start/end time for non-hourly truck", async ({ mount }) => {
    const component = await mount(
      <MaterialShipmentDataForm
        {...baseProps}
        formData={makeFormData(rateMaterial._id, {
          scenarioId: "s-pickup",
          truckingRateId: quantityTruckingRate._id!,
        })}
        jobsiteMaterials={[rateMaterial]}
        truckingRates={[quantityTruckingRate]}
      />
    );
    await expect(
      component.getByText("Start Time (optional)")
    ).not.toBeVisible();
  });

  test("shows required start/end time for hourly truck", async ({ mount }) => {
    const component = await mount(
      <MaterialShipmentDataForm
        {...baseProps}
        formData={makeFormData(rateMaterial._id, {
          scenarioId: "s-pickup",
          truckingRateId: hourlyTruckingRate._id!,
        })}
        jobsiteMaterials={[rateMaterial]}
        truckingRates={[hourlyTruckingRate]}
      />
    );
    await expect(component.getByText("Start Time")).toBeVisible();
    await expect(component.getByText("End Time")).toBeVisible();
  });
});

// ── Rate model — delivered scenario ───────────────────────────────────────

test.describe("Rate model — delivered scenario", () => {
  test("shows scenario picker", async ({ mount }) => {
    const component = await mount(
      <MaterialShipmentDataForm
        {...baseProps}
        formData={makeFormData(rateMaterial._id, { scenarioId: "s-tandem" })}
        jobsiteMaterials={[rateMaterial]}
        truckingRates={[quantityTruckingRate]}
      />
    );
    await expect(component.getByText("Rate Scenario")).toBeVisible();
  });

  test("hides vehicle section", async ({ mount }) => {
    const component = await mount(
      <MaterialShipmentDataForm
        {...baseProps}
        formData={makeFormData(rateMaterial._id, { scenarioId: "s-tandem" })}
        jobsiteMaterials={[rateMaterial]}
        truckingRates={[quantityTruckingRate]}
      />
    );
    await expect(component.getByText("Vehicle Source")).not.toBeVisible();
  });

  test("shows trucking-included callout", async ({ mount }) => {
    const component = await mount(
      <MaterialShipmentDataForm
        {...baseProps}
        formData={makeFormData(rateMaterial._id, { scenarioId: "s-tandem" })}
        jobsiteMaterials={[rateMaterial]}
        truckingRates={[quantityTruckingRate]}
      />
    );
    await expect(
      component.getByText(
        "Trucking is included in this rate — no vehicle info needed."
      )
    ).toBeVisible();
  });

  test("hides start/end time fields", async ({ mount }) => {
    const component = await mount(
      <MaterialShipmentDataForm
        {...baseProps}
        formData={makeFormData(rateMaterial._id, { scenarioId: "s-tandem" })}
        jobsiteMaterials={[rateMaterial]}
        truckingRates={[quantityTruckingRate]}
      />
    );
    await expect(
      component.getByText("Start Time (optional)")
    ).not.toBeVisible();
  });
});

// ── Interaction: switching scenarios ──────────────────────────────────────

test.describe("Scenario switching", () => {
  test("clicking delivered scenario hides vehicle section", async ({
    mount,
  }) => {
    let formData = makeFormData(rateMaterial._id, { scenarioId: "s-pickup" });
    const component = await mount(
      <MaterialShipmentDataForm
        {...baseProps}
        formData={formData}
        jobsiteMaterials={[rateMaterial]}
        truckingRates={[quantityTruckingRate]}
        onChange={(data) => {
          formData = data;
        }}
      />
    );

    // Vehicle section is visible for pickup
    await expect(component.getByText("Vehicle Source")).toBeVisible();

    // Click the Tandem (delivered) scenario card button specifically
    await component.getByRole("button", { name: /^Tandem/ }).click();
    await component.update(
      <MaterialShipmentDataForm
        {...baseProps}
        formData={{
          ...formData,
          vehicleObject: {
            ...formData.vehicleObject!,
            rateScenarioId: "s-tandem",
          },
        }}
        jobsiteMaterials={[rateMaterial]}
        truckingRates={[quantityTruckingRate]}
        onChange={() => {}}
      />
    );

    await expect(component.getByText("Vehicle Source")).not.toBeVisible();
  });
});
