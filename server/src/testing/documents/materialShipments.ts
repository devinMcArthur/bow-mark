import { MaterialShipment, MaterialShipmentDocument } from "@models";
import _ids from "@testing/_ids";

export interface SeededMaterialShipments {
  jobsite_1_base_1_1_shipment_1: MaterialShipmentDocument;
  jobsite_2_base_1_1_shipment_1: MaterialShipmentDocument;
  jobsite_2_base_1_1_shipment_2: MaterialShipmentDocument;
  jobsite_2_base_1_1_shipment_3: MaterialShipmentDocument;
  jobsite_2_base_1_1_shipment_4: MaterialShipmentDocument;
  jobsite_2_base_1_2_shipment_1: MaterialShipmentDocument;
}

const createMaterialShipments = async (): Promise<SeededMaterialShipments> => {
  const jobsite_1_base_1_1_shipment_1 = new MaterialShipment({
    _id: _ids.materialShipments.jobsite_1_base_1_1_shipment_1._id,
    shipmentType: "130MA",
    quantity: 50,
    unit: "m2",
    supplier: "Burnco",
    vehicle: _ids.vehicles.gravel_truck_1._id,
    noJobsiteMaterial: true,
  });

  const jobsite_2_base_1_1_shipment_1 = new MaterialShipment({
    _id: _ids.materialShipments.jobsite_2_base_1_1_shipment_1._id,
    jobsiteMaterial: _ids.jobsiteMaterials.jobsite_2_material_1._id,
    quantity: 200,
    vehicleObject: {
      source: "Burnco",
      vehicleCode: "13",
      vehicleType: "Tandem",
      truckingRateId: _ids.jobsites.jobsite_2.truckingRates[0],
    },
  });

  const jobsite_2_base_1_1_shipment_2 = new MaterialShipment({
    _id: _ids.materialShipments.jobsite_2_base_1_1_shipment_2._id,
    noJobsiteMaterial: true,
    quantity: 200,
    material: "Material",
    supplier: "Company 1",
    unit: "Tonnes",
    vehicleObject: {
      source: "Burnco",
      vehicleCode: "13",
      vehicleType: "Tandem",
    },
  });

  const jobsite_2_base_1_1_shipment_3 = new MaterialShipment({
    _id: _ids.materialShipments.jobsite_2_base_1_1_shipment_3._id,
    noJobsiteMaterial: false,
    jobsiteMaterial: _ids.jobsiteMaterials.jobsite_2_material_2._id,
    quantity: 200,
    vehicleObject: {
      source: "Burnco",
      vehicleCode: "14",
      vehicleType: "Tandem",
    },
  });

  const jobsite_2_base_1_1_shipment_4 = new MaterialShipment({
    _id: _ids.materialShipments.jobsite_2_base_1_1_shipment_4._id,
    noJobsiteMaterial: false,
    jobsiteMaterial: _ids.jobsiteMaterials.jobsite_2_material_2._id,
    quantity: 300,
    vehicleObject: {
      source: "Burnco",
      vehicleCode: "15",
      vehicleType: "Tandem",
    },
  });

  const jobsite_2_base_1_2_shipment_1 = new MaterialShipment({
    _id: _ids.materialShipments.jobsite_2_base_1_2_shipment_1._id,
    noJobsiteMaterial: false,
    jobsiteMaterial: _ids.jobsiteMaterials.jobsite_2_material_2._id,
    quantity: 100,
    vehicleObject: {
      source: "Burnco",
      vehicleCode: "24",
      vehicleType: "Tandem",
    },
  });

  const materialShipments = {
    jobsite_1_base_1_1_shipment_1,
    jobsite_2_base_1_1_shipment_1,
    jobsite_2_base_1_1_shipment_2,
    jobsite_2_base_1_1_shipment_3,
    jobsite_2_base_1_1_shipment_4,
    jobsite_2_base_1_2_shipment_1,
  };

  for (let i = 0; i < Object.values(materialShipments).length; i++) {
    await Object.values(materialShipments)[i].save();
  }

  return materialShipments;
};

export default createMaterialShipments;
