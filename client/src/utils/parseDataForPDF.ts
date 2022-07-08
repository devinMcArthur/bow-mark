import dayjs from "dayjs";
import {
  EmployeeWorkCardSnippetFragment,
  MaterialShipmentCardSnippetFragment,
  VehicleWorkCardSnippetFragment,
} from "../generated/graphql";

export interface IParsedEmployeeWork {
  employee: {
    _id: string;
    name: string;
  };
  jobs: {
    jobTitle: string;
    startTime: Date;
    endTime: Date;
    hours: number;
  }[];
  totalHours: number;
}

const employeeWork = (employeeWorks: EmployeeWorkCardSnippetFragment[]) => {
  const parsedEmployeeWork: IParsedEmployeeWork[] = [];

  const allEmployeeIds = Array.from(
    new Set(employeeWorks.map((work) => work.employee._id))
  );

  for (let i = 0; i < allEmployeeIds.length; i++) {
    const employeesWork = employeeWorks.filter(
      (work) => work.employee._id === allEmployeeIds[i]
    );

    let totalHours = 0;
    const jobs: IParsedEmployeeWork["jobs"] = employeesWork.map((work) => {
      const hours =
        Math.abs(dayjs(work.startTime).diff(work.endTime, "minutes")) / 60;

      totalHours += hours;

      return {
        startTime: work.startTime,
        endTime: work.endTime,
        jobTitle: work.jobTitle,
        hours,
      };
    });

    parsedEmployeeWork.push({
      employee: {
        name: employeesWork[0].employee.name,
        _id: employeesWork[0]._id,
      },
      jobs,
      totalHours,
    });
  }

  return parsedEmployeeWork;
};

export interface IParsedVehicleWork {
  vehicle: {
    _id: string;
    name: string;
  };
  jobs: {
    jobTitle: string;
    hours: number;
  }[];
  totalHours: number;
}

const vehicleWork = (
  vehicleWork: VehicleWorkCardSnippetFragment[]
): IParsedVehicleWork[] => {
  const parsedVehicleWork: IParsedVehicleWork[] = [];

  const allVehicleIds = Array.from(
    new Set(vehicleWork.map((work) => work.vehicle?._id))
  );

  for (let i = 0; i < allVehicleIds.length; i++) {
    const vehiclesWork = vehicleWork.filter(
      (work) => work.vehicle?._id === allVehicleIds[i]
    );

    let totalHours = 0;
    const jobs: IParsedVehicleWork["jobs"] = vehiclesWork.map((work) => {
      totalHours += work.hours;

      return {
        jobTitle: work.jobTitle || "",
        hours: work.hours,
      };
    });

    parsedVehicleWork.push({
      vehicle: {
        name: vehiclesWork[0].vehicle?.name || "NOT FOUND",
        _id: vehiclesWork[0]._id,
      },
      jobs,
      totalHours,
    });
  }

  return parsedVehicleWork;
};

export interface IParsedMaterials {
  materialShipments: MaterialShipmentCardSnippetFragment[];
  totalHours: number;
  totalQuantity: number;
}

const materialShipments = (
  materialShipments: MaterialShipmentCardSnippetFragment[]
) => {
  const parsedMaterialShipments: IParsedMaterials[] = [];

  const allMaterials = Array.from(
    new Set(
      materialShipments.map((shipment) => {
        if (shipment.noJobsiteMaterial) {
          return JSON.stringify({
            material: shipment.shipmentType,
            supplier: shipment.supplier,
          });
        } else {
          return JSON.stringify({
            material: shipment.jobsiteMaterial?.material.name,
            supplier: shipment.jobsiteMaterial?.supplier.name,
          });
        }
      })
    )
  );

  for (let i = 0; i < allMaterials.length; i++) {
    const material = JSON.parse(allMaterials[i]);

    const materialsShipments = materialShipments.filter((shipment) => {
      if (shipment.noJobsiteMaterial) {
        if (
          shipment.shipmentType === material.material &&
          shipment.supplier === material.supplier
        )
          return true;
        return false;
      } else {
        if (
          shipment.jobsiteMaterial?.material.name === material.material &&
          shipment.jobsiteMaterial?.supplier.name === material.supplier
        )
          return true;
        return false;
      }
    });

    let totalHours = 0,
      totalQuantity = 0;
    for (let i = 0; i < materialsShipments.length; i++) {
      totalQuantity += materialsShipments[i].quantity;
      totalHours +=
        materialsShipments[i].startTime && materialsShipments[i].endTime
          ? Math.abs(
              dayjs(materialsShipments[i].startTime).diff(
                dayjs(materialsShipments[i].endTime),
                "hours",
                true
              )
            )
          : 0;
    }

    parsedMaterialShipments.push({
      materialShipments: materialsShipments,
      totalHours,
      totalQuantity,
    });
  }

  return parsedMaterialShipments;
};

const parseDataForPDF = {
  employeeWork,
  vehicleWork,
  materialShipments,
};

export default parseDataForPDF;
