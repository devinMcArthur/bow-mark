import React from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
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
  shiftHoursByDate: Map<string, number>; // date → avg employee hours (shift length)
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
    shiftHoursByDate: new Map(),
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

  // Compute shift hours per date per crew.
  // Use crew.employees[name].byDate[date].hours — already correctly summed across all
  // EmployeeWork entries per employee per day — so count here is distinct employees, not entries.
  crewMap.forEach((crew) => {
    const dateAcc = new Map<string, { totalHours: number; count: number }>();
    crew.employees.forEach((empEntry) => {
      empEntry.byDate.forEach(({ hours }, date) => {
        const prev = dateAcc.get(date) ?? { totalHours: 0, count: 0 };
        dateAcc.set(date, { totalHours: prev.totalHours + hours, count: prev.count + 1 });
      });
    });
    dateAcc.forEach(({ totalHours, count }, date) => {
      if (count > 0) crew.shiftHoursByDate.set(date, totalHours / count);
    });
  });

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

/**
 * Compute utilization % for a vehicle over a period.
 * Only includes days where the vehicle was active (avoids diluting with absent days).
 * Returns null if no shift data is available.
 */
const computeUtilization = (
  vehicleByDate: Map<string, { hours: number; cost: number }>,
  shiftHoursByDate: Map<string, number>
): number | null => {
  let totalVehicleHours = 0;
  let totalShiftHours = 0;

  vehicleByDate.forEach(({ hours }, date) => {
    const shiftHours = shiftHoursByDate.get(date);
    if (shiftHours && shiftHours > 0) {
      totalVehicleHours += hours;
      totalShiftHours += shiftHours;
    }
  });

  if (totalShiftHours === 0) return null;
  return (totalVehicleHours / totalShiftHours) * 100;
};

// ---- StickyTable ----
// Splits Thead (sticky, outside overflow-x box) from Tbody (scrollable).
// Syncs horizontal scroll from body → header so column headers stay aligned.
const COL_HIGHLIGHT = "#EBF8FF"; // blue.50

const StickyTable = ({
  tableWidth,
  head,
  children,
}: {
  tableWidth: string;
  head: React.ReactNode;
  children: React.ReactNode;
}) => {
  const bodyRef = React.useRef<HTMLDivElement>(null);
  const headRef = React.useRef<HTMLDivElement>(null);
  const prevColRef = React.useRef<number | null>(null);

  const onBodyScroll = React.useCallback(() => {
    if (headRef.current && bodyRef.current) {
      headRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  }, []);

  const applyColHighlight = React.useCallback((colIdx: number | null) => {
    const prev = prevColRef.current;
    if (prev === colIdx) return;

    if (prev !== null) {
      headRef.current?.querySelectorAll(`tr th:nth-child(${prev + 1})`).forEach((el) => {
        (el as HTMLElement).style.backgroundColor = "";
      });
      bodyRef.current?.querySelectorAll(`tr td:nth-child(${prev + 1})`).forEach((el) => {
        (el as HTMLElement).style.backgroundColor = "";
      });
    }

    if (colIdx !== null) {
      headRef.current?.querySelectorAll(`tr th:nth-child(${colIdx + 1})`).forEach((el) => {
        (el as HTMLElement).style.backgroundColor = COL_HIGHLIGHT;
      });
      bodyRef.current?.querySelectorAll(`tr td:nth-child(${colIdx + 1})`).forEach((el) => {
        (el as HTMLElement).style.backgroundColor = COL_HIGHLIGHT;
      });
    }

    prevColRef.current = colIdx;
  }, []);

  const onMouseOver = React.useCallback(
    (e: React.MouseEvent) => {
      const cell = (e.target as HTMLElement).closest("td, th") as HTMLTableCellElement | null;
      applyColHighlight(cell ? cell.cellIndex : null);
    },
    [applyColHighlight]
  );

  const onMouseLeave = React.useCallback(() => applyColHighlight(null), [applyColHighlight]);

  return (
    <Box onMouseOver={onMouseOver} onMouseLeave={onMouseLeave}>
      <Box ref={headRef} position="sticky" top={0} zIndex={2} bg="white" sx={{ overflowX: "hidden" }}>
        <Table size="sm" sx={{ tableLayout: "fixed" }} w={tableWidth}>
          <Thead>{head}</Thead>
        </Table>
      </Box>
      <Box ref={bodyRef} sx={{ overflowX: "auto" }} onScroll={onBodyScroll}>
        <Table size="sm" sx={{ tableLayout: "fixed" }} w={tableWidth}>
          <Tbody>{children}</Tbody>
        </Table>
      </Box>
    </Box>
  );
};

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
      {open && <Stack spacing={4} pt={2}>

          {/* Employees */}
          {crew.employees.size > 0 && (
            <Box>
              <Heading size="xs" mb={2} color="gray.600">Employees</Heading>
              <StickyTable
                tableWidth={`${340 + dates.length * 70}px`}
                head={
                  <Tr>
                    <Th w="160px" position="sticky" left={0} zIndex={1}>Name</Th>
                    <Th isNumeric w="85px" position="sticky" left="160px" zIndex={1}>Total Hrs</Th>
                    <Th isNumeric w="95px" position="sticky" left="245px" zIndex={1}>Total Cost</Th>
                    {dates.map((d) => (
                      <Th key={d} w="70px" isNumeric whiteSpace="nowrap">{fmtDateHeader(d)}</Th>
                    ))}
                  </Tr>
                }
              >
                {Array.from(crew.employees.entries()).map(([name, entry]) => (
                  <Tr bg="white" _hover={{ bg: "blue.50" }} key={name}>
                    <Td w="160px" position="sticky" left={0} zIndex={1} fontWeight="medium">{name}</Td>
                    <Td isNumeric w="85px" position="sticky" left="160px" zIndex={1}>{formatNumber(entry.totalHours)}</Td>
                    <Td isNumeric w="95px" position="sticky" left="245px" zIndex={1}>{formatCurrency(entry.totalCost)}</Td>
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
              </StickyTable>
            </Box>
          )}

          {/* Vehicles */}
          {crew.vehicles.size > 0 && (
            <Box>
              <Heading size="xs" mb={2} color="gray.600">Equipment</Heading>
              <StickyTable
                tableWidth={`${455 + dates.length * 80}px`}
                head={
                  <Tr>
                    <Th w="160px" position="sticky" left={0} zIndex={1}>Vehicle</Th>
                    <Th w="75px" position="sticky" left="160px" zIndex={1}>Code</Th>
                    <Th isNumeric w="125px" position="sticky" left="235px" zIndex={1}>Total Hrs / Util</Th>
                    <Th isNumeric w="95px" position="sticky" left="360px" zIndex={1}>Total Cost</Th>
                    {dates.map((d) => (
                      <Th key={d} w="80px" isNumeric whiteSpace="nowrap">{fmtDateHeader(d)}</Th>
                    ))}
                  </Tr>
                }
              >
                {Array.from(crew.vehicles.entries()).map(([name, entry]) => {
                  const totalUtil = computeUtilization(entry.byDate, crew.shiftHoursByDate);
                  return (
                    <Tr bg="white" _hover={{ bg: "blue.50" }} key={name}>
                      <Td w="160px" position="sticky" left={0} zIndex={1} fontWeight="medium">{entry.name}</Td>
                      <Td w="75px" position="sticky" left="160px" zIndex={1} color="gray.500">{entry.code}</Td>
                      <Td isNumeric w="125px" position="sticky" left="235px" zIndex={1}>
                        <Text as="span">{formatNumber(entry.totalHours)}</Text>
                        {totalUtil != null && (
                          <Text as="span" color="gray.500" fontSize="xs" ml={1}>
                            ({Math.round(totalUtil)}%)
                          </Text>
                        )}
                      </Td>
                      <Td isNumeric w="95px" position="sticky" left="360px" zIndex={1}>{formatCurrency(entry.totalCost)}</Td>
                      {dates.map((d) => {
                        const day = entry.byDate.get(d);
                        const shiftHours = crew.shiftHoursByDate.get(d);
                        const dailyUtil =
                          day && shiftHours && shiftHours > 0
                            ? Math.round((day.hours / shiftHours) * 100)
                            : null;
                        return (
                          <Td key={d} isNumeric color={day ? undefined : "gray.300"}>
                            {day ? (
                              <>
                                <Text as="span">{formatNumber(day.hours)}</Text>
                                {dailyUtil != null && (
                                  <Text as="span" color="gray.500" fontSize="xs" ml={1}>
                                    ({dailyUtil}%)
                                  </Text>
                                )}
                              </>
                            ) : (
                              "—"
                            )}
                          </Td>
                        );
                      })}
                    </Tr>
                  );
                })}
              </StickyTable>
            </Box>
          )}

          {/* Materials */}
          {crew.materials.size > 0 && (
            <Box>
              <Heading size="xs" mb={2} color="gray.600">Materials</Heading>
              <StickyTable
                tableWidth={`${470 + dates.length * 70}px`}
                head={
                  <Tr>
                    <Th w="160px" position="sticky" left={0} zIndex={1}>Material</Th>
                    <Th w="120px" position="sticky" left="160px" zIndex={1}>Supplier</Th>
                    <Th isNumeric w="95px" position="sticky" left="280px" zIndex={1}>Total Qty</Th>
                    <Th isNumeric w="95px" position="sticky" left="375px" zIndex={1}>Total Cost</Th>
                    {dates.map((d) => (
                      <Th key={d} w="70px" isNumeric whiteSpace="nowrap">{fmtDateHeader(d)}</Th>
                    ))}
                  </Tr>
                }
              >
                {Array.from(crew.materials.entries()).map(([key, entry]) => {
                  const [matName] = key.split("|");
                  return (
                    <Tr bg="white" _hover={{ bg: "blue.50" }} key={key}>
                      <Td w="160px" position="sticky" left={0} zIndex={1} fontWeight="medium">
                        {matName}
                        {entry.estimated && (
                          <Badge ml={1} colorScheme="yellow" fontSize="xs">Est</Badge>
                        )}
                      </Td>
                      <Td w="120px" position="sticky" left="160px" zIndex={1} color="gray.500">{entry.supplier}</Td>
                      <Td isNumeric w="95px" position="sticky" left="280px" zIndex={1}>{formatNumber(entry.totalQty)} {entry.unit}</Td>
                      <Td isNumeric w="95px" position="sticky" left="375px" zIndex={1}>{formatCurrency(entry.totalCost)}</Td>
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
              </StickyTable>
            </Box>
          )}

          {/* Non-Costed Materials */}
          {crew.nonCostedMaterials.size > 0 && (
            <Box>
              <Heading size="xs" mb={2} color="gray.600">Non-Costed Materials</Heading>
              <StickyTable
                tableWidth={`${375 + dates.length * 70}px`}
                head={
                  <Tr>
                    <Th w="160px" position="sticky" left={0} zIndex={1}>Material</Th>
                    <Th w="120px" position="sticky" left="160px" zIndex={1}>Supplier</Th>
                    <Th isNumeric w="95px" position="sticky" left="280px" zIndex={1}>Total Qty</Th>
                    {dates.map((d) => (
                      <Th key={d} w="70px" isNumeric whiteSpace="nowrap">{fmtDateHeader(d)}</Th>
                    ))}
                  </Tr>
                }
              >
                {Array.from(crew.nonCostedMaterials.entries()).map(([key, entry]) => {
                  const [matName] = key.split("|");
                  return (
                    <Tr bg="white" _hover={{ bg: "blue.50" }} key={key}>
                      <Td w="160px" position="sticky" left={0} zIndex={1} fontWeight="medium">{matName}</Td>
                      <Td w="120px" position="sticky" left="160px" zIndex={1} color="gray.500">{entry.supplier}</Td>
                      <Td isNumeric w="95px" position="sticky" left="280px" zIndex={1}>{formatNumber(entry.totalQty)} {entry.unit}</Td>
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
              </StickyTable>
            </Box>
          )}

          {/* Trucking */}
          {crew.trucking.size > 0 && (
            <Box>
              <Heading size="xs" mb={2} color="gray.600">Trucking</Heading>
              <StickyTable
                tableWidth={`${440 + dates.length * 70}px`}
                head={
                  <Tr>
                    <Th w="160px" position="sticky" left={0} zIndex={1}>Type</Th>
                    <Th w="100px" position="sticky" left="160px" zIndex={1}>Rate</Th>
                    <Th isNumeric w="85px" position="sticky" left="260px" zIndex={1}>Total Qty</Th>
                    <Th isNumeric w="95px" position="sticky" left="345px" zIndex={1}>Total Cost</Th>
                    {dates.map((d) => (
                      <Th key={d} w="70px" isNumeric whiteSpace="nowrap">{fmtDateHeader(d)}</Th>
                    ))}
                  </Tr>
                }
              >
                {Array.from(crew.trucking.entries()).map(([type, entry]) => (
                  <Tr bg="white" _hover={{ bg: "blue.50" }} key={type}>
                    <Td w="160px" position="sticky" left={0} zIndex={1} fontWeight="medium">{type}</Td>
                    <Td w="100px" position="sticky" left="160px" zIndex={1} color="gray.500">${formatNumber(entry.rate)}/{entry.rateType}</Td>
                    <Td isNumeric w="85px" position="sticky" left="260px" zIndex={1}>{formatNumber(entry.totalQty)}</Td>
                    <Td isNumeric w="95px" position="sticky" left="345px" zIndex={1}>{formatCurrency(entry.totalCost)}</Td>
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
              </StickyTable>
            </Box>
          )}

        </Stack>}
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
