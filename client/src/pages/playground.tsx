import ClientOnly from "../components/Common/ClientOnly";
import PlaygroundClientOnly from "../components/pages/playground";

const Playground = () => {
  return (
    <ClientOnly>
      <PlaygroundClientOnly />
    </ClientOnly>
  );
};

export default Playground;
