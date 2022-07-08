import { Types } from "mongoose";

const _ids = {
  users: {
    base_foreman_1_user: {
      _id: Types.ObjectId("621680482564b66de7083a1b"),
    },
    admin_user: {
      _id: Types.ObjectId("6241f81d8b757d1c8ae18b13"),
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
    temp_1: {
      _id: Types.ObjectId("622fcce9e0f9c395301fd290"),
    },
    temp_2: {
      _id: Types.ObjectId("622fcdf33c054c0d1a5f6efc"),
    },
    office_admin: {
      _id: Types.ObjectId("6241f83c8542b250a1b765ba"),
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
    temp_1: {
      _id: Types.ObjectId("622fd2be8e227b86fa70011b"),
    },
    temp_2: {
      _id: Types.ObjectId("622fd2f7def783383cb5382d"),
    },
  },
  jobsites: {
    jobsite_1: {
      _id: Types.ObjectId("6215691ccb7aa6ac216ee294"),
    },
    jobsite_2: {
      _id: Types.ObjectId("623e0c5d2afef82206a0ddab"),
      truckingRates: [Types.ObjectId("626615c34e988c91ed92f909")],
    },
    jobsite_3: {
      _id: Types.ObjectId("623e1a1089ebc16dedabb5a6"),
    },
  },
  dailyReports: {
    jobsite_1_base_1_1: {
      _id: Types.ObjectId("621664558c026b7ac8fb32ef"),
    },
    jobsite_1_base_1_2: {
      _id: Types.ObjectId("62391e90ec22ce6458bd2d18"),
    },
    jobsite_1_base_1_3: {
      _id: Types.ObjectId("62391e91ec22ce6458bd2d18"),
    },
    jobsite_2_base_1_1: {
      _id: Types.ObjectId("623e0f6a31d677c42489c429"),
    },
    jobsite_2_base_1_2: {
      _id: Types.ObjectId("629a4f158797abb2e41b6d3e"),
    },
  },
  employeeWork: {
    jobsite_1_base_1_1_base_foreman_1: {
      _id: Types.ObjectId("621667718d92575bd6dc70d5"),
    },
    jobsite_1_base_1_1_base_foreman_2: {
      _id: Types.ObjectId("62561436e466aa29d292a133"),
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
    jobsite_2_base_1_1_shipment_1: {
      _id: Types.ObjectId("623e1409a3978a439d410d37"),
    },
    jobsite_2_base_1_1_shipment_2: {
      _id: Types.ObjectId("624792144af001f675c4e35b"),
    },
    jobsite_2_base_1_1_shipment_3: {
      _id: Types.ObjectId("629a4a166ba2f0701b21ee6d"),
    },
    jobsite_2_base_1_1_shipment_4: {
      _id: Types.ObjectId("629a5081f9eaca061f998bb5"),
    },
    jobsite_2_base_1_2_shipment_1: {
      _id: Types.ObjectId("629a4eb086b1168a8d05dfa2"),
    },
  },
  reportNotes: {
    jobsite_1_base_1_1_note_1: {
      _id: Types.ObjectId("62166ef0c9f15a5eab653a30"),
    },
  },
  signups: {
    base_laborer_3_signup: {
      _id: Types.ObjectId("6228ffc52185c765f07a6d51"),
    },
  },
  materials: {
    material_1: {
      _id: Types.ObjectId("6238b5c46503b1eece33f067"),
    },
    material_2: {
      _id: Types.ObjectId("6238bdbc28c679f033f05ebf"),
    },
    material_3: {
      _id: Types.ObjectId("627d386f0d42691f3cd9f54a"),
    },
  },
  files: {
    jobsite_1_base_1_1_file_1: {
      _id: Types.ObjectId("623930a9601034ef3cd7efc3"),
    },
    jobsite_1_file_1: {
      _id: Types.ObjectId("628d23ace484ea40f7dcd888"),
    },
  },
  companies: {
    company_1: {
      _id: Types.ObjectId("623ce5b096c3254a9ebe55a6"),
    },
  },
  jobsiteMaterials: {
    jobsite_2_material_1: {
      _id: Types.ObjectId("623e0c5d2afef82206a0ddab"),
    },
    jobsite_2_material_2: {
      _id: Types.ObjectId("629a49205f76f65244785a10"),
    },
    jobsite_3_material_1: {
      _id: Types.ObjectId("623e1a391900170e516390e7"),
    },
  },
  invoices: {
    jobsite_3_invoice_1: {
      _id: Types.ObjectId("6241fc1132d9ce63e6fbf373"),
    },
    jobsite_3_invoice_2: {
      _id: Types.ObjectId("62420a9f8e9f9f8b8f9f8b8f"),
    },
    jobsite_2_material_1_invoice_1: {
      _id: Types.ObjectId("629a4ac6f7d6b66e1a77b344"),
    },
    jobsite_2_material_1_invoice_2: {
      _id: Types.ObjectId("629a4f49b52ab2ee3d34104a"),
    },
  },
};

export default _ids;
