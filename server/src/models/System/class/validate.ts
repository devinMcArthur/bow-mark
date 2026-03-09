import { SystemModel } from "@models";

const system = async (System: SystemModel) => {
  const systems = await System.find();

  if (systems.length === 0) {
    await System.createDocument();
  } else if (systems.length > 1) {
    const sorted = systems
      .slice()
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

    // remove all system document except for the first created
    for (let i = 1; i < sorted.length; i++) {
      await sorted[i].remove();
    }
  }

  return;
};

export default {
  system,
};
