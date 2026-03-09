import React from "react";

const useMounted = (): { hasMounted: boolean } => {
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  return { hasMounted };
};

export default useMounted;
