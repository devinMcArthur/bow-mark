import React from "react";
import Image from "next/image";

const ProprietaryIcon = () => {
  const src = React.useMemo(() => {
    return "/icons/list.png";
  }, []);

  return <Image src={src} width="250px" height="250px" alt="icon" />;
};

export default ProprietaryIcon;
