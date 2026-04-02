// src/pages/pricing/rate-builder/[id].tsx
import React from "react";
import { useRouter } from "next/router";
import { useAuth } from "../../../contexts/Auth";
import { UserRoles } from "../../../generated/graphql";
import hasPermission from "../../../utils/hasPermission";
import ClientOnly from "../../../components/Common/ClientOnly";
import CalculatorCanvas from "../../../components/pages/developer/CalculatorCanvas";

// Navbar is 3.4rem, header bar is 36px
const CANVAS_HEIGHT = "calc(100vh - 3.4rem - 36px)";

const RateBuildupEditorPage: React.FC = () => {
  const { state: { user } } = useAuth();
  const router = useRouter();
  const { id } = router.query;

  React.useEffect(() => {
    if (user === null) {
      router.replace("/");
    } else if (user !== undefined && !hasPermission(user.role, UserRoles.ProjectManager)) {
      router.replace("/");
    }
  }, [user, router]);

  if (!user || !hasPermission(user.role, UserRoles.ProjectManager)) return null;
  if (!id || typeof id !== "string") return null;

  return (
    <ClientOnly>
      <CalculatorCanvas docId={id} canvasHeight={CANVAS_HEIGHT} />
    </ClientOnly>
  );
};

export default RateBuildupEditorPage;
