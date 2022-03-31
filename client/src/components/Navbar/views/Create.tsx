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
import createLink from "../../../utils/createLink";
import AdminOnly from "../../Common/AdminOnly";
import CompanyCreateForm from "../../Forms/Company/CompanyCreate";
import CrewCreateForm from "../../Forms/Crew/CrewCreate";
import DailyReportCreateForm from "../../Forms/DailyReport/DailyReportCreate";
import JobsiteCreateForm from "../../Forms/Jobsite/JobsiteCreate";
import MaterialCreateForm from "../../Forms/Material/MaterialCreate";

const NavbarCreate = () => {
  /**
   * ----- Hook Initialization
   */

  const {
    state: { user },
  } = useAuth();

  const router = useRouter();

  const [form, setForm] = React.useState<
    "dailyReport" | "jobsite" | "crew" | "material" | "company"
  >();

  /**
   * ----- Rendering
   */

  return React.useMemo(() => {
    if (user) {
      return (
        <Box height="100%" pt={1}>
          <Menu>
            {/* @ts-expect-error */}
            <MenuButton
              as={IconButton}
              icon={<FiPlus />}
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
              <MenuItem onClick={() => setForm("dailyReport")}>
                Daily Report
              </MenuItem>
              <AdminOnly>
                <MenuItem onClick={() => setForm("jobsite")}>Jobsite</MenuItem>
                <MenuItem onClick={() => setForm("crew")}>Crew</MenuItem>
                <MenuItem onClick={() => setForm("material")}>
                  Material
                </MenuItem>
                <MenuItem onClick={() => setForm("company")}>Company</MenuItem>
              </AdminOnly>
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
        </Box>
      );
    } else {
      return null;
    }
  }, [form, router, user]);
};

export default NavbarCreate;