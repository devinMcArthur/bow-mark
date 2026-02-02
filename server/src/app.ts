import { makeExecutableSchema } from "@graphql-tools/schema";
import { ApolloServerPluginDrainHttpServer } from "apollo-server-core";
import { ApolloServer } from "apollo-server-express";
import cors from "cors";
import express from "express";
import { graphqlUploadExpress } from "graphql-upload";
import { useServer } from "graphql-ws/lib/use/ws";
import { createServer } from "http";
import jwt from "jsonwebtoken";
import { buildTypeDefsAndResolvers } from "type-graphql";
import { Server } from "ws";
import fileRouter from "./router/files";

import { IContext } from "@typescript/graphql";

import CompanyResolver, {
  CompanyMaterialReportResolver,
  CompanyMaterialReportJobDayResolver,
} from "@graphql/resolvers/company";
import CrewResolver, {
  CrewLocationDayItemResolver,
  CrewLocationDayResolver,
  CrewLocationResolver,
} from "@graphql/resolvers/crew";
import DailyReportResolver from "@graphql/resolvers/dailyReport";
import EmployeeResolver from "@graphql/resolvers/employee";
import EmployeeReportResolver from "@graphql/resolvers/employeeReport";
import EmployeeWorkResolver from "@graphql/resolvers/employeeWork";
import FileResolver from "@graphql/resolvers/file";
import InvoiceResolver from "@graphql/resolvers/invoice";
import InvoiceReportResolver from "@graphql/resolvers/invoiceReport";
import JobsiteResolver from "@graphql/resolvers/jobsite";
import JobsiteDayReportResolver from "@graphql/resolvers/jobsiteDayReport";
import JobsiteFileObjectResolver from "@graphql/resolvers/jobsiteFileObject";
import JobsiteMaterialResolver from "@graphql/resolvers/jobsiteMaterial";
import JobsiteMonthReportResolver from "@graphql/resolvers/jobsiteMonthReport";
import JobsiteYearMasterReportResolver from "@graphql/resolvers/jobsiteYearMasterReport";
import JobsiteYearMasterReportItemResolver from "@graphql/resolvers/jobsiteYearMasterReportItem";
import JobsiteYearReportResolver from "@graphql/resolvers/jobsiteYearReport";
import JobsiteReportPGResolver from "@graphql/resolvers/jobsiteReportPG";
import MaterialResolver from "@graphql/resolvers/material";
import MaterialReportResolver from "@graphql/resolvers/materialReport";
import MaterialShipmentResolver from "@graphql/resolvers/materialShipment";
import OperatorDailyReportResolver from "@graphql/resolvers/operatorDailyReport";
import NonCostedMaterialReportResolver from "@graphql/resolvers/nonCostedMaterialReport";
import OnSiteSummaryReportResolver from "@graphql/resolvers/onSiteSummaryReport";
import ProductionResolver from "@graphql/resolvers/production";
import RangeSummaryReportResolver from "@graphql/resolvers/rangeSummaryReport";
import ReportIssueFullResolver from "@graphql/resolvers/reportIssueFull";
import ReportNoteResolver from "@graphql/resolvers/reportNote";
import SignupResolver from "@graphql/resolvers/signup";
import SystemResolver from "@graphql/resolvers/system";
import TruckingReportResolver from "@graphql/resolvers/truckingReport";
import UserResolver from "@graphql/resolvers/user";
import VehicleResolver from "@graphql/resolvers/vehicle";
import VehicleIssueResolver from "@graphql/resolvers/vehicleIssue";
import VehicleReportResolver from "@graphql/resolvers/vehicleReport";
import VehicleWorkResolver from "@graphql/resolvers/vehicleWork";

import SearchResolver from "@graphql/resolvers/search";

import { logger } from "@logger";
import { User, UserDocument } from "@models";
import pubsub from "@pubsub";
import authChecker from "@utils/authChecker";

const createApp = async () => {
  const app = express();

  app.use(cors());

  app.use(express.json({ limit: "100mb" }));

  const { typeDefs, resolvers } = await buildTypeDefsAndResolvers({
    resolvers: [
      CompanyResolver,
      CompanyMaterialReportResolver,
      CompanyMaterialReportJobDayResolver,
      CrewResolver,
      CrewLocationDayItemResolver,
      CrewLocationDayResolver,
      CrewLocationResolver,
      DailyReportResolver,
      EmployeeResolver,
      EmployeeReportResolver,
      EmployeeWorkResolver,
      FileResolver,
      InvoiceResolver,
      InvoiceReportResolver,
      JobsiteResolver,
      JobsiteDayReportResolver,
      JobsiteFileObjectResolver,
      JobsiteMaterialResolver,
      JobsiteMonthReportResolver,
      JobsiteYearMasterReportResolver,
      JobsiteYearMasterReportItemResolver,
      JobsiteYearReportResolver,
      JobsiteReportPGResolver,
      MaterialResolver,
      MaterialReportResolver,
      MaterialShipmentResolver,
      OperatorDailyReportResolver,
      NonCostedMaterialReportResolver,
      OnSiteSummaryReportResolver,
      ProductionResolver,
      RangeSummaryReportResolver,
      ReportIssueFullResolver,
      ReportNoteResolver,
      SearchResolver,
      SignupResolver,
      SystemResolver,
      TruckingReportResolver,
      UserResolver,
      VehicleResolver,
      VehicleIssueResolver,
      VehicleReportResolver,
      VehicleWorkResolver,
    ],
    authChecker,
    pubSub: pubsub,
  });

  const schema = makeExecutableSchema({
    resolvers: resolvers,
    typeDefs,
  });

  const httpServer = createServer(app);

  const wsServer = new Server({
    server: httpServer,
    path: "/graphql",
  });

  const serverCleanup = useServer({ schema }, wsServer);

  const apolloServer = new ApolloServer({
    schema,
    context: async ({ req, res }: IContext) => {
      const token = req.headers.authorization;

      let user: UserDocument | null = null;

      if (token) {
        if (!process.env.JWT_SECRET)
          throw new Error("Must provide a JWT_SECRET");

        try {
          jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
          throw new Error("Cut it out hackerman");
        }

        const decoded = jwt.decode(token);

        user = await User.getById((decoded as jwt.JwtPayload)?.userId);
      }

      return {
        user,
        req,
        res,
      };
    },
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
        async requestDidStart() {
          return {
            async didEncounterErrors(context) {
              if (process.env.NODE_ENV !== "test")
                logger.error({
                  message: context.errors[0].message || "Apollo request error",
                  meta: {
                    variables: context.request.variables,
                    // errors: JSON.stringify(context.errors),
                    operationName: context.operationName,
                    stack: context.errors[0].stack,
                  },
                });
            },
          };
        },
      },
    ],
  });

  app.use(
    graphqlUploadExpress({
      maxFileSize: 100000000, // 100mb
      maxFiles: 20,
    })
  );

  app.use("/file", fileRouter);

  await apolloServer.start();

  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  return httpServer;
};

export default createApp;
