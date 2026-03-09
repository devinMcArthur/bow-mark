import { Box, Heading } from "@chakra-ui/react";
import React from "react";
import { useSystem } from "../../../../contexts/System";
import Loading from "../../../Common/Loading";
import SystemCompanyVehicleTypeDefaults from "../../../Common/System/CompanyVehicleTypeDefaults";
import SystemCosting from "../../../Common/System/Costing";
import SystemFluidTypes from "../../../Common/System/FluidTypes";
import SystemLaborTypes from "../../../Common/System/LaborTypes";
import SystemMaterialShipmentVehicleTypeDefaults from "../../../Common/System/MaterialShipmentVehicleTypeDefaults";
import SystemUnits from "../../../Common/System/Units";

const SystemSettings = () => {
  /**
   * ----- Hook Initialization -----
   */

  const {
    state: { system },
  } = useSystem();

  /**
   * ----- Rendering -----
   */

  return React.useMemo(() => {
    if (system) {
      return (
        <Box>
          <Heading>System</Heading>
          <SystemUnits system={system} />
          <SystemLaborTypes system={system} />
          <SystemFluidTypes system={system} />
          <SystemMaterialShipmentVehicleTypeDefaults
            system={system}
            showEditAllLink
          />
          <SystemCompanyVehicleTypeDefaults system={system} />
          <SystemCosting system={system} />
        </Box>
      );
    } else return <Loading />;
  }, [system]);
};

export default SystemSettings;
