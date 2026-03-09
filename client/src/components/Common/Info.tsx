import { Icon, IconProps, Tooltip } from "@chakra-ui/react";
import { FiInfo } from "react-icons/fi";

interface IInfoTooltip extends IconProps {
  description: string;
}

const InfoTooltip = ({ description, ...props }: IInfoTooltip) => {
  return (
    <Tooltip label={description}>
      <span>
        <Icon as={FiInfo} {...props} />
      </span>
    </Tooltip>
  );
};

export default InfoTooltip;
