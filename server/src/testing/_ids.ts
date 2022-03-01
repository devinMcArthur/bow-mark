import { Types } from "mongoose";

const _ids = {
  users: {
    base_foreman_1_user: {
      _id: Types.ObjectId("621680482564b66de7083a1b"),
    },
  },
  crews: {
    base_1: {
      _id: Types.ObjectId("62156102e79a8931895f2b2a"),
    },
  },
  employees: {
    base_foreman_1: {
      _id: Types.ObjectId("621561ea51451bd8efd6842b"),
    },
    base_operator_1: {
      _id: Types.ObjectId("621562358cf4cd673f394f4f"),
    },
    base_laborer_1: {
      _id: Types.ObjectId("62156205aebfc2b5dd05d842"),
    },
    base_laborer_2: {
      _id: Types.ObjectId("6215621989117f60ab451c30"),
    },
    base_laborer_3: {
      _id: Types.ObjectId("6215623f22057ba3cfbd959a"),
    },
  },
  vehicles: {
    personnel_truck_1: {
      _id: Types.ObjectId("6215659a5684b191d1da2f69"),
    },
    skidsteer_1: {
      _id: Types.ObjectId("621565b46af7dffb67cb3fc5"),
    },
    gravel_truck_1: {
      _id: Types.ObjectId("621565c67fbbbddff42b17e0"),
    },
  },
  jobsites: {
    jobsite_1: {
      _id: Types.ObjectId("6215691ccb7aa6ac216ee294"),
    },
  },
  dailyReports: {
    jobsite_1_base_1_1: {
      _id: Types.ObjectId("621664558c026b7ac8fb32ef"),
    },
  },
  employeeWork: {
    jobsite_1_base_1_1_base_foreman_1: {
      _id: Types.ObjectId("621667718d92575bd6dc70d5"),
    },
  },
  vehicleWork: {
    jobsite_1_base_1_1_skidsteer_1: {
      _id: Types.ObjectId("62166a572a3444b242d7801c"),
    },
  },
  productions: {
    jobsite_1_base_1_1_production_1: {
      _id: Types.ObjectId("62166bd2bab11e05ea2f6c0d"),
    },
  },
  materialShipments: {
    jobsite_1_base_1_1_shipment_1: {
      _id: Types.ObjectId("62166e38ef63bebc19532513"),
    },
  },
  reportNotes: {
    jobsite_1_base_1_1_note_1: {
      _id: Types.ObjectId("62166ef0c9f15a5eab653a30"),
    },
  },
};

export default _ids;