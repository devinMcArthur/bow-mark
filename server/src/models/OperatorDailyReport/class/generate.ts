import { OperatorDailyReportDocument } from "@models";
import { BLANK_PDF, Template, generate } from "@pdfme/generator";
import dayjs from "dayjs";

const pdf = async (operatorDailyReport: OperatorDailyReportDocument) => {
  const redColor = "#822727", greenColor = "#22543D";
  /**
    * Title: Vehicle - Date
    * Author
    * General:
    *  - Usage: 112 hours / km
    *  - Start Time
    * Checklist
    * Function Checks
    * Issue Checks
    * Leaks:
    *  - type
    *  - location
    * Fluids Added
    *  - type
    *  - amount
    */

  const leaksTemplate: Record<string, unknown> = {};
  const leaksInput: Record<string, unknown> = {};

  let leakStartY = 160;
  for (let i = 0; i < operatorDailyReport.leaks.length; i++) {
    const leak = operatorDailyReport.leaks[i];
    const typeIndex = `leakType-${i}`;
    const locationIndex = `leakLocation=${i}`;

    leaksTemplate[typeIndex] = {
      type: "text",
      position: {
        x: 15,
        y: leakStartY,
      },
      width: 60,
      height: 5,
      dynamicFontSize: {
        min: 8,
        max: 13
      }
    };
    leaksTemplate[locationIndex] = {
      type: "text",
      position: {
        x: 15,
        y: leakStartY + 6
      },
      width: 60,
      height: 5,
      dynamicFontSize: {
        min: 8,
        max: 13
      }
    };

    leaksInput[typeIndex] = `Type: ${leak.type}`;
    leaksInput[locationIndex] = `Location: ${leak.location}`;

    leakStartY += 20;
  }


  const fluidsTemplate: Record<string, unknown> = {};
  const fluidsInput: Record<string, unknown> = {};

  let fluidStartY = 160;
  for (let i = 0; i < operatorDailyReport.fluidsAdded.length; i++) {
    const fluid = operatorDailyReport.fluidsAdded[i];
    const typeIndex = `fluidType-${i}`;
    const amountIndex = `fluidAmount=${i}`;

    fluidsTemplate[typeIndex] = {
      type: "text",
      position: {
        x: 80,
        y: fluidStartY,
      },
      width: 60,
      height: 5,
      dynamicFontSize: {
        min: 8,
        max: 13
      }
    };
    fluidsTemplate[amountIndex] = {
      type: "text",
      position: {
        x: 80,
        y: fluidStartY + 6
      },
      width: 60,
      height: 5,
      dynamicFontSize: {
        min: 8,
        max: 13
      }
    };

    fluidsInput[typeIndex] = `Type: ${fluid.type}`;
    fluidsInput[amountIndex] = `Amount: ${fluid.amount.toLocaleString("en-US")} Litres`;

    fluidStartY += 20;
  }

  const template: Template = {
    basePdf: BLANK_PDF,
    schemas: [
      {
        /**
         * Title Section
         */
        vehicle: {
          type: "text",
          position: {
            x: 10,
            y: 10,
          },
          width: 200,
          height: 10,
          fontSize: 20,
        },
        date: {
          type: "text",
          position: {
            x: 10,
            y: 20
          },
          width: 200,
          height: 5,
        },
        author: {
          type: "text",
          position: {
            x: 10,
            y: 25,
          },
          width: 90,
          height: 5
        },
        /**
         * General Section
         */
        generalTitle: {
          type: "text",
          position: {
            x: 15,
            y: 35,
          },
          width: 200,
          height: 10,
          fontSize: 20
        },
        usageTitle: {
          type: "text",
          position: {
            x: 15,
            y: 40,
          },
          width: 50,
          height: 10,
          fontSize: 15,
          verticalAlignment: "bottom"
        },
        usage: {
          type: "text",
          position: {
            x: 32,
            y: 40
          },
          width: 50,
          height: 10,
          verticalAlignment: "bottom"
        },
        startTimeTitle: {
          type: "text",
          position: {
            x: 80,
            y: 40,
          },
          width: 50,
          height: 10,
          fontSize: 15,
          verticalAlignment: "bottom"
        },
        startTime: {
          type: "text",
          position: {
            x: 107,
            y: 40
          },
          width: 50,
          height: 10,
          verticalAlignment: "bottom"
        },
        /**
         * Checklist Section
         */
        checklistTitle: {
          type: "text",
          position: {
            x: 15,
            y: 55,
          },
          width: 200,
          height: 10,
          fontSize: 20
        },
        walkAroundTitle: {
          type: "text",
          position: {
            x: 15,
            y: 62,
          },
          width: 50,
          height: 10,
          fontSize: 15,
          verticalAlignment: "bottom"
        },
        walkAround: {
          type: "text",
          position: {
            x: 53,
            y: 62
          },
          width: 50,
          height: 10,
          verticalAlignment: "bottom",
          fontColor: operatorDailyReport.checklist.walkaroundComplete ? greenColor : redColor
        },
        visualInspectionTitle: {
          type: "text",
          position: {
            x: 80,
            y: 62,
          },
          width: 50,
          height: 10,
          fontSize: 15,
          verticalAlignment: "bottom"
        },
        visualInspection: {
          type: "text",
          position: {
            x: 123,
            y: 62
          },
          width: 50,
          height: 10,
          verticalAlignment: "bottom",
          fontColor: operatorDailyReport.checklist.visualInspectionComplete ? greenColor : redColor
        },
        oilTitle: {
          type: "text",
          position: {
            x: 15,
            y: 72,
          },
          width: 50,
          height: 10,
          fontSize: 15,
          verticalAlignment: "bottom"
        },
        oil: {
          type: "text",
          position: {
            x: 53,
            y: 72
          },
          width: 50,
          height: 10,
          verticalAlignment: "bottom",
          fontColor: operatorDailyReport.checklist.oilChecked ? greenColor : redColor
        },
        coolantTitle: {
          type: "text",
          position: {
            x: 80,
            y: 72,
          },
          width: 50,
          height: 10,
          fontSize: 15,
          verticalAlignment: "bottom"
        },
        coolant: {
          type: "text",
          position: {
            x: 123,
            y: 72
          },
          width: 50,
          height: 10,
          verticalAlignment: "bottom",
          fontColor: operatorDailyReport.checklist.coolantChecked ? greenColor : redColor
        },
        fluidTitle: {
          type: "text",
          position: {
            x: 15,
            y: 82,
          },
          width: 50,
          height: 10,
          fontSize: 15,
          verticalAlignment: "bottom"
        },
        fluid: {
          type: "text",
          position: {
            x: 53,
            y: 82
          },
          width: 50,
          height: 10,
          verticalAlignment: "bottom",
          fontColor: operatorDailyReport.checklist.fluidsChecked ? greenColor : redColor
        },
        /**
         * Function Check Section
         */
        functionCheckTitle: {
          type: "text",
          position: {
            x: 15,
            y: 95,
          },
          width: 200,
          height: 10,
          fontSize: 20
        },
        backupAlarmTitle: {
          type: "text",
          position: {
            x: 15,
            y: 102,
          },
          width: 50,
          height: 10,
          fontSize: 15,
          verticalAlignment: "bottom"
        },
        backupAlarm: {
          type: "text",
          position: {
            x: 53,
            y: 102
          },
          width: 50,
          height: 10,
          verticalAlignment: "bottom",
          fontColor: operatorDailyReport.functionChecks.backupAlarm ? greenColor : redColor
        },
        lightsTitle: {
          type: "text",
          position: {
            x: 80,
            y: 102,
          },
          width: 50,
          height: 10,
          fontSize: 15,
          verticalAlignment: "bottom"
        },
        lights: {
          type: "text",
          position: {
            x: 123,
            y: 102
          },
          width: 50,
          height: 10,
          verticalAlignment: "bottom",
          fontColor: operatorDailyReport.functionChecks.lights ? greenColor : redColor
        },
        licensePlateTitle: {
          type: "text",
          position: {
            x: 15,
            y: 112,
          },
          width: 50,
          height: 10,
          fontSize: 15,
          verticalAlignment: "bottom"
        },
        licensePlate: {
          type: "text",
          position: {
            x: 53,
            y: 112
          },
          width: 50,
          height: 10,
          verticalAlignment: "bottom",
          fontColor: operatorDailyReport.functionChecks.licensePlate ? greenColor : redColor
        },
        fireExtinguisherTitle: {
          type: "text",
          position: {
            x: 80,
            y: 112,
          },
          width: 50,
          height: 10,
          fontSize: 15,
          verticalAlignment: "bottom"
        },
        fireExtinguisher: {
          type: "text",
          position: {
            x: 123,
            y: 112
          },
          width: 50,
          height: 10,
          verticalAlignment: "bottom",
          fontColor: operatorDailyReport.functionChecks.fireExtinguisher ? greenColor : redColor
        },
        /**
         * Issue Check Section
         */
        issueCheckTitle: {
          type: "text",
          position: {
            x: 15,
            y: 125,
          },
          width: 200,
          height: 10,
          fontSize: 20
        },
        damageTitle: {
          type: "text",
          position: {
            x: 15,
            y: 132,
          },
          width: 50,
          height: 10,
          fontSize: 15,
          verticalAlignment: "bottom"
        },
        damage: {
          type: "text",
          position: {
            x: 53,
            y: 132
          },
          width: 50,
          height: 10,
          verticalAlignment: "bottom",
          fontColor: operatorDailyReport.damageObserved ? greenColor : redColor
        },
        malfunctionTitle: {
          type: "text",
          position: {
            x: 80,
            y: 132,
          },
          width: 50,
          height: 10,
          fontSize: 15,
          verticalAlignment: "bottom"
        },
        malfunction: {
          type: "text",
          position: {
            x: 123,
            y: 132
          },
          width: 50,
          height: 10,
          verticalAlignment: "bottom",
          fontColor: operatorDailyReport.malfunction ? greenColor : redColor
        },
        /**
         * Leaks
         */
        leaksTitle: {
          type: "text",
          position: {
            x: 15,
            y: 150,
          },
          width: 100,
          height: 10,
          fontSize: 20
        },
        ...fluidsTemplate,
        /**
         * Fluids Added
         */
        fluidsAddedTitle: {
          type: "text",
          position: {
            x: 80,
            y: 150,
          },
          width: 100,
          height: 10,
          fontSize: 20
        },
        ...leaksTemplate
      },
    ]
  };

  const employee = await operatorDailyReport.getAuthor();
  const vehicle = await operatorDailyReport.getVehicle();

  const inputs = [
    {
      date: dayjs(operatorDailyReport.createdAt).format("dddd, MMM D, YYYY"),
      vehicle: `${vehicle.vehicleCode} - ${vehicle.name} (${vehicle.vehicleType})`,
      author: employee.name,
      generalTitle: "General",
      usageTitle: "Usage:",
      usage: `${operatorDailyReport.equipmentUsage.usage.toLocaleString("en-US")} ${operatorDailyReport.equipmentUsage.unit}`,
      startTimeTitle: "Start Time:",
      startTime: dayjs(operatorDailyReport.startTime).format("hh:mm a"),
      checklistTitle: "Checklist",
      walkAroundTitle: "Walk Around:",
      walkAround: operatorDailyReport.checklist.walkaroundComplete ? "Finished" : "Not Done",
      visualInspectionTitle: "Visual Inspection:",
      visualInspection: operatorDailyReport.checklist.walkaroundComplete ? "Finished" : "Not Done",
      oilTitle: "Oil Checked:",
      oil: operatorDailyReport.checklist.oilChecked ? "Finished" : "Not Done",
      coolantTitle: "Coolant Checked:",
      coolant: operatorDailyReport.checklist.coolantChecked ? "Finished" : "Not Done",
      fluidTitle: "Fluids Checked:",
      fluid: operatorDailyReport.checklist.fluidsChecked ? "Finished" : "Not Done",
      functionCheckTitle: "Function Check",
      backupAlarmTitle: "Backup Alarm:",
      backupAlarm: operatorDailyReport.functionChecks.backupAlarm ? "Proper" : "Improper",
      lightsTitle: "Lights:",
      lights: operatorDailyReport.functionChecks.lights ? "Proper" : "Improper",
      licensePlateTitle: "License Plate:",
      licensePlate: operatorDailyReport.functionChecks.licensePlate ? "Proper" : "Improper",
      fireExtinguisherTitle: "Fire Extinguisher:",
      fireExtinguisher: operatorDailyReport.functionChecks.fireExtinguisher ? "Proper" : "Improper",
      issueCheckTitle: "Issue Checks",
      damageTitle: "Damage Found:",
      damage: operatorDailyReport.damageObserved ? "Yes" : "No",
      malfunctionTitle: "Malfunction:",
      malfunction: operatorDailyReport.malfunction ? "Yes" : "No",
      leaksTitle: "Leaks",
      ...leaksInput,
      fluidsAddedTitle: "Fluids Added",
      ...fluidsInput
    }
  ];

  const pdf = await generate({ template, inputs });

  return pdf;
};

export default {
  pdf
};
