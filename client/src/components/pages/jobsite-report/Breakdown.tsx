import React from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Collapse,
  Heading,
  HStack,
  IconButton,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import {
  JobsiteReportQuery,
  useJobsiteReportQuery,
} from "../../../generated/graphql";
import formatNumber from "../../../utils/formatNumber";
import Card from "../../Common/Card";

interface IBreakdown {
  jobsiteMongoId: string;
  startDate: string;
  endDate: string;
}

type DayReport = NonNullable<
  JobsiteReportQuery["jobsiteReport"]
>["dayReports"][0];

// ---- Aggregation types ----
interface EmpEntry {
  totalHours: number;
  totalCost: number;
  byDate: Map<string, { hours: number; cost: number }>;
}
interface VehEntry {
  name: string;
  code: string;
  totalHours: number;
  totalCost: number;
  byDate: Map<string, { hours: number; cost: number }>;
}
interface MatEntry {
  supplier: string;
  unit: string;
  totalQty: number;
  totalCost: number;
  estimated: boolean;
  byDate: Map<string, { qty: number; cost: number }>;
}
interface NonCostMatEntry {
  supplier: string;
  unit: string;
  totalQty: number;
  byDate: Map<string, number>;
}
interface TruckEntry {
  rate: number;
  rateType: string;
  totalQty: number;
  totalHours: number;
  totalCost: number;
  byDate: Map<string, { qty: number; hours: number; cost: number }>;
}
interface CrewData {
  employees: Map<string, EmpEntry>;
  vehicles: Map<string, VehEntry>;
  materials: Map<string, MatEntry>;
  nonCostedMaterials: Map<string, NonCostMatEntry>;
  trucking: Map<string, TruckEntry>;
  totalEmployeeCost: number;
  totalEmployeeHours: number;
  totalVehicleCost: number;
  totalVehicleHours: number;
  totalMaterialCost: number;
  totalMaterialQty: number;
  totalTruckingCost: number;
}

function emptyCrewData(): CrewData {
  return {
    employees: new Map(),
    vehicles: new Map(),
    materials: new Map(),
    nonCostedMaterials: new Map(),
    trucking: new Map(),
    totalEmployeeCost: 0,
    totalEmployeeHours: 0,
    totalVehicleCost: 0,
    totalVehicleHours: 0,
    totalMaterialCost: 0,
    totalMaterialQty: 0,
    totalTruckingCost: 0,
  };
}

function aggregateDayReports(dayReports: DayReport[]): {
  crewMap: Map<string, CrewData>;
  dates: string[];
} {
  const crewMap = new Map<string, CrewData>();
  const dateSet = new Set<string>();

  for (const day of dayReports) {
    const dateStr = new Date(day.date).toISOString().split("T")[0];
    dateSet.add(dateStr);

    for (const emp of day.employees) {
      if (!crewMap.has(emp.crewType)) crewMap.set(emp.crewType, emptyCrewData());
      const crew = crewMap.get(emp.crewType)!;
      crew.totalEmployeeCost += emp.cost;
      crew.totalEmployeeHours += emp.hours;
      if (!crew.employees.has(emp.employeeName)) {
        crew.employees.set(emp.employeeName, { totalHours: 0, totalCost: 0, byDate: new Map() });
      }
      const entry = crew.employees.get(emp.employeeName)!;
      entry.totalHours += emp.hours;
      entry.totalCost += emp.cost;
      const prev = entry.byDate.get(dateStr) || { hours: 0, cost: 0 };
      entry.byDate.set(dateStr, { hours: prev.hours + emp.hours, cost: prev.cost + emp.cost });
    }

    for (const veh of day.vehicles) {
      if (!crewMap.has(veh.crewType)) crewMap.set(veh.crewType, emptyCrewData());
      const crew = crewMap.get(veh.crewType)!;
      crew.totalVehicleCost += veh.cost;
      crew.totalVehicleHours += veh.hours;
      const key = veh.vehicleId;
      if (!crew.vehicles.has(key)) {
        crew.vehicles.set(key, { name: veh.vehicleName, code: veh.vehicleCode, totalHours: 0, totalCost: 0, byDate: new Map() });
      }
      const entry = crew.vehicles.get(key)!;
      entry.totalHours += veh.hours;
      entry.totalCost += veh.cost;
      const prev = entry.byDate.get(dateStr) || { hours: 0, cost: 0 };
      entry.byDate.set(dateStr, { hours: prev.hours + veh.hours, cost: prev.cost + veh.cost });
    }

    for (const mat of day.materials) {
      if (!crewMap.has(mat.crewType)) crewMap.set(mat.crewType, emptyCrewData());
      const crew = crewMap.get(mat.crewType)!;
      crew.totalMaterialCost += mat.cost;
      crew.totalMaterialQty += mat.quantity;
      const key = `${mat.materialName}|${mat.supplierName}`;
      if (!crew.materials.has(key)) {
        crew.materials.set(key, { supplier: mat.supplierName, unit: mat.unit, totalQty: 0, totalCost: 0, estimated: mat.estimated, byDate: new Map() });
      }
      const entry = crew.materials.get(key)!;
      entry.totalQty += mat.quantity;
      entry.totalCost += mat.cost;
      if (mat.estimated) entry.estimated = true;
      const prev = entry.byDate.get(dateStr) || { qty: 0, cost: 0 };
      entry.byDate.set(dateStr, { qty: prev.qty + mat.quantity, cost: prev.cost + mat.cost });
    }

    for (const nc of day.nonCostedMaterials) {
      if (!crewMap.has(nc.crewType)) crewMap.set(nc.crewType, emptyCrewData());
      const crew = crewMap.get(nc.crewType)!;
      const key = `${nc.materialName}|${nc.supplierName}`;
      if (!crew.nonCostedMaterials.has(key)) {
        crew.nonCostedMaterials.set(key, { supplier: nc.supplierName, unit: nc.unit || "", totalQty: 0, byDate: new Map() });
      }
      const entry = crew.nonCostedMaterials.get(key)!;
      entry.totalQty += nc.quantity;
      const prev = entry.byDate.get(dateStr) || 0;
      entry.byDate.set(dateStr, prev + nc.quantity);
    }

    for (const trk of day.trucking) {
      if (!crewMap.has(trk.crewType)) crewMap.set(trk.crewType, emptyCrewData());
      const crew = crewMap.get(trk.crewType)!;
      crew.totalTruckingCost += trk.cost;
      if (!crew.trucking.has(trk.truckingType)) {
        crew.trucking.set(trk.truckingType, { rate: trk.rate, rateType: trk.rateType, totalQty: 0, totalHours: 0, totalCost: 0, byDate: new Map() });
      }
      const entry = crew.trucking.get(trk.truckingType)!;
      entry.totalQty += trk.quantity;
      entry.totalHours += trk.hours ?? 0;
      entry.totalCost += trk.cost;
      const prev = entry.byDate.get(dateStr) || { qty: 0, hours: 0, cost: 0 };
      entry.byDate.set(dateStr, { qty: prev.qty + trk.quantity, hours: prev.hours + (trk.hours ?? 0), cost: prev.cost + trk.cost });
    }
  }

  const dates = Array.from(dateSet).sort();
  return { crewMap, dates };
}

// ---- Date header formatter ----
const fmtDateHeader = (dateStr: string) => {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
};

// ---- Currency formatter ----
const formatCurrency = (n: number) =>
  n < 0 ? `-$${formatNumber(Math.abs(n))}` : `$${formatNumber(n)}`;

// ---- CrewCard ----
interface ICrewCard {
  crewType: string;
  crew: CrewData;
}

const CrewCard = ({ crewType, crew }: ICrewCard) => {
  const dates = React.useMemo(() => {
    const dateSet = new Set<string>();
    Array.from(crew.employees.values()).forEach((e) => e.byDate.forEach((_, d) => dateSet.add(d)));
    Array.from(crew.vehicles.values()).forEach((v) => v.byDate.forEach((_, d) => dateSet.add(d)));
    Array.from(crew.materials.values()).forEach((m) => m.byDate.forEach((_, d) => dateSet.add(d)));
    Array.from(crew.nonCostedMaterials.values()).forEach((n) => n.byDate.forEach((_, d) => dateSet.add(d)));
    Array.from(crew.trucking.values()).forEach((t) => t.byDate.forEach((_, d) => dateSet.add(d)));
    return Array.from(dateSet).sort();
  }, [crew]);
  const [open, setOpen] = React.useState(false);

  return (
    <Card
      heading={
        <HStack justify="space-between" w="100%">
          <HStack>
            <IconButton
              aria-label="Toggle"
              icon={open ? <FiChevronDown /> : <FiChevronRight />}
              size="xs"
              variant="ghost"
              onClick={() => setOpen(!open)}
            />
            <Heading size="sm">{crewType}</Heading>
          </HStack>
          <HStack spacing={4} fontSize="sm" color="gray.600" flexWrap="wrap">
            <Text>Wages: <strong>{formatCurrency(crew.totalEmployeeCost)}</strong></Text>
            <Text>Equip: <strong>{formatCurrency(crew.totalVehicleCost)}</strong></Text>
            <Text>Mat: <strong>{formatCurrency(crew.totalMaterialCost)}</strong></Text>
            <Text>Trucking: <strong>{formatCurrency(crew.totalTruckingCost)}</strong></Text>
          </HStack>
        </HStack>
      }
    >
      <Collapse in={open} animateOpacity>
        <Stack spacing={4} pt={2}>

          {/* Employees */}
          {crew.employees.size > 0 && (
            <Box>
              <Heading size="xs" mb={2} color="gray.600">Employees</Heading>
              <Box overflowX="auto">
                <Table size="sm" minW="600px">
                  <Thead>
                    <Tr>
                      <Th minW="150px">Name</Th>
                      <Th isNumeric>Total Hrs</Th>
                      <Th isNumeric>Total Cost</Th>
                      {dates.map((d) => (
                        <Th key={d} isNumeric whiteSpace="nowrap">{fmtDateHeader(d)}</Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {Array.from(crew.employees.entries()).map(([name, entry]) => (
                      <Tr key={name}>
                        <Td fontWeight="medium">{name}</Td>
                        <Td isNumeric>{formatNumber(entry.totalHours)}</Td>
                        <Td isNumeric>{formatCurrency(entry.totalCost)}</Td>
                        {dates.map((d) => {
                          const day = entry.byDate.get(d);
                          return (
                            <Td key={d} isNumeric color={day ? undefined : "gray.300"}>
                              {day ? formatNumber(day.hours) : "—"}
                            </Td>
                          );
                        })}
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Box>
          )}

          {/* Vehicles */}
          {crew.vehicles.size > 0 && (
            <Box>
              <Heading size="xs" mb={2} color="gray.600">Equipment</Heading>
              <Box overflowX="auto">
                <Table size="sm" minW="600px">
                  <Thead>
                    <Tr>
                      <Th minW="150px">Vehicle</Th>
                      <Th>Code</Th>
                      <Th isNumeric>Total Hrs</Th>
                      <Th isNumeric>Total Cost</Th>
                      {dates.map((d) => (
                        <Th key={d} isNumeric whiteSpace="nowrap">{fmtDateHeader(d)}</Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {Array.from(crew.vehicles.entries()).map(([name, entry]) => (
                      <Tr key={name}>
                        <Td fontWeight="medium">{entry.name}</Td>
                        <Td color="gray.500">{entry.code}</Td>
                        <Td isNumeric>{formatNumber(entry.totalHours)}</Td>
                        <Td isNumeric>{formatCurrency(entry.totalCost)}</Td>
                        {dates.map((d) => {
                          const day = entry.byDate.get(d);
                          return (
                            <Td key={d} isNumeric color={day ? undefined : "gray.300"}>
                              {day ? formatNumber(day.hours) : "—"}
                            </Td>
                          );
                        })}
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Box>
          )}

          {/* Materials */}
          {crew.materials.size > 0 && (
            <Box>
              <Heading size="xs" mb={2} color="gray.600">Materials</Heading>
              <Box overflowX="auto">
                <Table size="sm" minW="600px">
                  <Thead>
                    <Tr>
                      <Th minW="150px">Material</Th>
                      <Th>Supplier</Th>
                      <Th isNumeric>Total Qty</Th>
                      <Th isNumeric>Total Cost</Th>
                      {dates.map((d) => (
                        <Th key={d} isNumeric whiteSpace="nowrap">{fmtDateHeader(d)}</Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {Array.from(crew.materials.entries()).map(([key, entry]) => {
                      const [matName] = key.split("|");
                      return (
                        <Tr key={key}>
                          <Td fontWeight="medium">
                            {matName}
                            {entry.estimated && (
                              <Badge ml={1} colorScheme="yellow" fontSize="xs">Est</Badge>
                            )}
                          </Td>
                          <Td color="gray.500">{entry.supplier}</Td>
                          <Td isNumeric>{formatNumber(entry.totalQty)} {entry.unit}</Td>
                          <Td isNumeric>{formatCurrency(entry.totalCost)}</Td>
                          {dates.map((d) => {
                            const day = entry.byDate.get(d);
                            return (
                              <Td key={d} isNumeric color={day ? undefined : "gray.300"}>
                                {day ? formatNumber(day.qty) : "—"}
                              </Td>
                            );
                          })}
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>
            </Box>
          )}

          {/* Non-Costed Materials */}
          {crew.nonCostedMaterials.size > 0 && (
            <Box>
              <Heading size="xs" mb={2} color="gray.600">Non-Costed Materials</Heading>
              <Box overflowX="auto">
                <Table size="sm" minW="600px">
                  <Thead>
                    <Tr>
                      <Th minW="150px">Material</Th>
                      <Th>Supplier</Th>
                      <Th isNumeric>Total Qty</Th>
                      {dates.map((d) => (
                        <Th key={d} isNumeric whiteSpace="nowrap">{fmtDateHeader(d)}</Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {Array.from(crew.nonCostedMaterials.entries()).map(([key, entry]) => {
                      const [matName] = key.split("|");
                      return (
                        <Tr key={key}>
                          <Td fontWeight="medium">{matName}</Td>
                          <Td color="gray.500">{entry.supplier}</Td>
                          <Td isNumeric>{formatNumber(entry.totalQty)} {entry.unit}</Td>
                          {dates.map((d) => {
                            const qty = entry.byDate.get(d);
                            return (
                              <Td key={d} isNumeric color={qty ? undefined : "gray.300"}>
                                {qty ? formatNumber(qty) : "—"}
                              </Td>
                            );
                          })}
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>
            </Box>
          )}

          {/* Trucking */}
          {crew.trucking.size > 0 && (
            <Box>
              <Heading size="xs" mb={2} color="gray.600">Trucking</Heading>
              <Box overflowX="auto">
                <Table size="sm" minW="600px">
                  <Thead>
                    <Tr>
                      <Th minW="150px">Type</Th>
                      <Th>Rate</Th>
                      <Th isNumeric>Total Qty</Th>
                      <Th isNumeric>Total Cost</Th>
                      {dates.map((d) => (
                        <Th key={d} isNumeric whiteSpace="nowrap">{fmtDateHeader(d)}</Th>
                      ))}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {Array.from(crew.trucking.entries()).map(([type, entry]) => (
                      <Tr key={type}>
                        <Td fontWeight="medium">{type}</Td>
                        <Td color="gray.500">${formatNumber(entry.rate)}/{entry.rateType}</Td>
                        <Td isNumeric>{formatNumber(entry.totalQty)}</Td>
                        <Td isNumeric>{formatCurrency(entry.totalCost)}</Td>
                        {dates.map((d) => {
                          const day = entry.byDate.get(d);
                          return (
                            <Td key={d} isNumeric color={day ? undefined : "gray.300"}>
                              {day ? formatNumber(day.qty) : "—"}
                            </Td>
                          );
                        })}
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Box>
          )}

        </Stack>
      </Collapse>
    </Card>
  );
};

// ---- Main Breakdown component ----
const Breakdown = ({ jobsiteMongoId, startDate, endDate }: IBreakdown) => {
  const { data, loading, error } = useJobsiteReportQuery({
    variables: {
      jobsiteMongoId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    },
    skip: !jobsiteMongoId,
  });

  const report = data?.jobsiteReport;

  const { crewMap } = React.useMemo(() => {
    if (!report) return { crewMap: new Map<string, CrewData>(), dates: [] };
    return aggregateDayReports(report.dayReports);
  }, [report]);

  if (loading && !report) {
    return (
      <Box display="flex" justifyContent="center" p={8}>
        <Spinner size="xl" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        Error loading breakdown: {error.message}
      </Alert>
    );
  }

  if (!report || crewMap.size === 0) {
    return (
      <Alert status="warning">
        <AlertIcon />
        No on-site data found for this jobsite in the selected date range.
      </Alert>
    );
  }

  return (
    <Box overflowY="auto" h="100%" w="100%">
      <Stack spacing={3}>
        {report.crewTypes.map((crewType) => {
          const crew = crewMap.get(crewType);
          if (!crew) return null;
          return (
            <CrewCard
              key={crewType}
              crewType={crewType}
              crew={crew}
            />
          );
        })}
      </Stack>
    </Box>
  );
};

export default Breakdown;
