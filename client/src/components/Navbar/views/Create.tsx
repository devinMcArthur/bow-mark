import {
  Box,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import React from "react";
import { FiPlus } from "react-icons/fi";
import { useAuth } from "../../../contexts/Auth";
import { UserRoles, UserTypes } from "../../../generated/graphql";
import createLink from "../../../utils/createLink";
import Permission from "../../Common/Permission";
import CompanyCreateForm from "../../Forms/Company/CompanyCreate";
import CrewCreateForm from "../../Forms/Crew/CrewCreate";
import DailyReportCreateForm from "../../Forms/DailyReport/DailyReportCreate";
import EmployeeCreateForm from "../../Forms/Employee/EmployeeCreate";
import JobsiteCreateForm from "../../Forms/Jobsite/JobsiteCreate";
import MaterialCreateForm from "../../Forms/Material/MaterialCreate";
import OperatorDailyReportVehicleSelectForm from "../../Forms/OperatorDailyReport/VehicleSelect";

const NavbarCreate = () => {
  /**
   * --- Hook Initialization ---
   */

  const {
    state: { user },
  } = useAuth();

  const router = useRouter();

  const [form, setForm] = React.useState<
    | "dailyReport"
    | "jobsite"
    | "crew"
    | "material"
    | "company"
    | "employee"
    | "operatorDailyReport"
  >();

  /**
   * ----- Rendering
   */

  return React.useMemo(() => {
    if (user) {
      return (
        <Box height="100%" pt={1}>
          <Menu>
            <MenuButton
              as={IconButton}
              icon={React.createElement(FiPlus) as React.ReactElement<any, any>}
              my="auto"
              size="sm"
              backgroundColor="transparent"
              aria-label="add"
              p={0}
              border="2px solid"
              borderColor="gray.700"
              _hover={{ backgroundColor: "rgba(113,128,150,0.1)" }}
              _focus={{ backgroundColor: "rgba(113,128,150,0.1)" }}
              _active={{ backgroundColor: "rgba(113,128,150,0.1)" }}
            />
            <MenuList>
              <Permission minRole={UserRoles.User} type={UserTypes.Operations}>
                <MenuItem onClick={() => setForm("dailyReport")}>
                  Daily Report
                </MenuItem>
              </Permission>
              <Permission
                minRole={UserRoles.User}
                type={UserTypes.VehicleMaintenance}
              >
                <MenuItem onClick={() => setForm("operatorDailyReport")}>
                  Operator Daily Report
                </MenuItem>
              </Permission>
              <Permission minRole={UserRoles.ProjectManager}>
                <MenuItem onClick={() => setForm("jobsite")}>Jobsite</MenuItem>
              </Permission>
              <Permission>
                <MenuItem onClick={() => setForm("crew")}>Crew</MenuItem>
                <MenuItem onClick={() => setForm("employee")}>
                  Employee
                </MenuItem>
                <MenuItem onClick={() => setForm("material")}>
                  Material
                </MenuItem>
                <MenuItem onClick={() => setForm("company")}>Company</MenuItem>
              </Permission>
            </MenuList>
          </Menu>
          {/* DAILY REPORT */}
          <Modal
            isOpen={form === "dailyReport"}
            onClose={() => setForm(undefined)}
          >
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Daily Report</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <DailyReportCreateForm
                  onSuccess={(dailyReport) => {
                    setForm(undefined);
                    router.push(createLink.dailyReport(dailyReport._id));
                  }}
                />
              </ModalBody>
            </ModalContent>
          </Modal>
          {/* OPERATOR DAILY REPORT */}
          <Modal
            isOpen={form === "operatorDailyReport"}
            onClose={() => setForm(undefined)}
          >
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Operator Daily Report</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <OperatorDailyReportVehicleSelectForm
                  onSubmit={(vehicleId) => {
                    setForm(undefined);
                    router.push(
                      createLink.vehicleOperatorDailyReportCreate(vehicleId)
                    );
                  }}
                />
              </ModalBody>
            </ModalContent>
          </Modal>
          {/* JOBSITE */}
          <Modal isOpen={form === "jobsite"} onClose={() => setForm(undefined)}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Jobsite</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <JobsiteCreateForm
                  onSuccess={(jobsite) => {
                    setForm(undefined);
                    router.push(createLink.jobsite(jobsite._id));
                  }}
                />
              </ModalBody>
            </ModalContent>
          </Modal>
          {/* CREW */}
          <Modal isOpen={form === "crew"} onClose={() => setForm(undefined)}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Crew</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <CrewCreateForm
                  onSuccess={(crew) => {
                    setForm(undefined);
                    router.push(createLink.crew(crew._id));
                  }}
                />
              </ModalBody>
            </ModalContent>
          </Modal>
          {/* MATERIAL */}
          <Modal
            isOpen={form === "material"}
            onClose={() => setForm(undefined)}
          >
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Material</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <MaterialCreateForm
                  onSuccess={() => {
                    setForm(undefined);
                  }}
                />
              </ModalBody>
            </ModalContent>
          </Modal>
          {/* COMPANY */}
          <Modal isOpen={form === "company"} onClose={() => setForm(undefined)}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Company</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <CompanyCreateForm
                  onSuccess={() => {
                    setForm(undefined);
                  }}
                />
              </ModalBody>
            </ModalContent>
          </Modal>
          {/* EMPLOYEE */}
          <Modal
            isOpen={form === "employee"}
            onClose={() => setForm(undefined)}
          >
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Employee</ModalHeader>
              <ModalCloseButton />
              <ModalBody>
                <EmployeeCreateForm
                  onSuccess={(employee) => {
                    setForm(undefined);
                    router.push(createLink.employee(employee._id));
                  }}
                />
              </ModalBody>
            </ModalContent>
          </Modal>
        </Box>
      );
    } else {
      return null;
    }
  }, [form, router, user]);
};

export default NavbarCreate;
