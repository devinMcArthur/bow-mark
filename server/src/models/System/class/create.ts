import { SystemModel, SystemDocument } from "@models";

const document = async (System: SystemModel): Promise<SystemDocument> => {
  const systems = await System.find();
  if (systems.length > 0)
    throw new Error("Can only create a single System document");

  const system = new System({
    unitDefaults: ["tonnes", "m2", "inches", "cm"],
    laborTypes: [],
    companyVehicleTypeDefaults: [
      {
        title: "Tandem",
        rates: [
          {
            date: new Date(),
            rate: 82,
          },
        ],
      },
      {
        title: "Lowboy",
        rates: [
          {
            date: new Date(),
            rate: 203,
          },
        ],
      },
    ],
    materialShipmentVehicleTypeDefaults: [
      {
        title: "Tandem",
        rates: [
          {
            date: new Date(),
            rate: 90,
          },
        ],
      },
      {
        title: "Truck and Pup",
        rates: [
          {
            date: new Date(),
            rate: 120,
          },
        ],
      },
      {
        title: "Truck and Tri",
        rates: [
          {
            date: new Date(),
            rate: 130,
          },
        ],
      },
      {
        title: "Truck and Wagon",
        rates: [
          {
            date: new Date(),
            rate: 145,
          },
        ],
      },
      {
        title: "Tandem BM",
        rates: [
          {
            date: new Date(),
            rate: 82,
          },
        ],
      },
      {
        title: "Truck and Pup BM",
        rates: [
          {
            date: new Date(),
            rate: 111,
          },
        ],
      },
      {
        title: "Truck and Tri BM",
        rates: [
          {
            date: new Date(),
            rate: 120,
          },
        ],
      },
      {
        title: "Tractor/Lowboy BM",
        rates: [
          {
            date: new Date(),
            rate: 203,
          },
        ],
      },
    ],
  });

  await system.save();

  return system;
};

export default {
  document,
};
