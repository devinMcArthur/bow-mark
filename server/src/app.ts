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
import chatRouter from "./router/chat";
import conversationsRouter from "./router/conversations";
import fileRouter from "./router/files";
import tenderChatRouter from "./router/tender-chat";
import foremanJobsiteChatRouter from "./router/foreman-jobsite-chat";
import pmJobsiteChatRouter from "./router/pm-jobsite-chat";
import tenderConversationsRouter from "./router/tender-conversations";
import enrichedFilesRouter from "./router/enriched-files";
import publicDocumentsRouter from "./router/public-documents";
import developerRouter from "./router/developer";

import { IContext } from "@typescript/graphql";

import BusinessDashboardResolver from "@graphql/resolvers/businessDashboard";
import CompanyResolver, {
  CompanyMaterialReportResolver,
  CompanyMaterialReportJobDayResolver,
} from "@graphql/resolvers/company";
import CrewResolver, {
  CrewLocationDayItemResolver,
  CrewLocationDayResolver,
  CrewLocationResolver,
} from "@graphql/resolvers/crew";
import CrewKindResolver from "@graphql/resolvers/crewKind";
import DailyReportResolver from "@graphql/resolvers/dailyReport";
import DomainEventResolver from "@graphql/resolvers/domainEvent";
import EntityPresenceResolver from "@graphql/resolvers/entityPresence";
import EmployeeResolver from "@graphql/resolvers/employee";
import EmployeeReportResolver from "@graphql/resolvers/employeeReport";
import EmployeeWorkResolver from "@graphql/resolvers/employeeWork";
import EnrichedFileResolver from "@graphql/resolvers/enrichedFile";
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
import ProductivityAnalyticsResolver from "@graphql/resolvers/productivityAnalytics";
import ProductivityBenchmarksResolver from "@graphql/resolvers/productivityBenchmarks";
import FinancialPerformanceResolver from "@graphql/resolvers/financialPerformance";
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
import RateBuildupTemplateResolver from "@graphql/resolvers/rateBuildupTemplate";
import TenderResolver from "@graphql/resolvers/tender";
import TenderPricingSheetResolver from "@graphql/resolvers/tenderPricingSheet";
import TenderReviewResolver from "@graphql/resolvers/tenderReview";
import PublicDocumentResolver from "@graphql/resolvers/publicDocument";
import TruckingReportResolver from "@graphql/resolvers/truckingReport";
import UserResolver from "@graphql/resolvers/user";
import VehicleResolver from "@graphql/resolvers/vehicle";
import VehicleIssueResolver from "@graphql/resolvers/vehicleIssue";
import VehicleReportResolver from "@graphql/resolvers/vehicleReport";
import VehicleWorkResolver from "@graphql/resolvers/vehicleWork";

import SearchResolver from "@graphql/resolvers/search";

import { logger } from "@logger";
import { User, UserDocument, Conversation } from "@models";
import pubsub from "@pubsub";
import authChecker from "@utils/authChecker";
import { requestContextMiddleware } from "@middleware/requestContext";
import {
  getRequestContext,
  runWithContext,
  type RequestContext,
} from "@lib/requestContext";

const createApp = async () => {
  const app = express();

  // Must come first: stamps trace context on every request so downstream
  // middleware, resolvers, and mutations can emit correlated events.
  app.use(requestContextMiddleware);

  app.use(cors());

  app.use(express.json({ limit: "500mb" }));

  const { typeDefs, resolvers } = await buildTypeDefsAndResolvers({
    resolvers: [
      BusinessDashboardResolver,
      CompanyResolver,
      CompanyMaterialReportResolver,
      CompanyMaterialReportJobDayResolver,
      CrewResolver,
      CrewKindResolver,
      CrewLocationDayItemResolver,
      CrewLocationDayResolver,
      CrewLocationResolver,
      DailyReportResolver,
      DomainEventResolver,
      EntityPresenceResolver,
      EmployeeResolver,
      EmployeeReportResolver,
      EmployeeWorkResolver,
      EnrichedFileResolver,
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
      ProductivityAnalyticsResolver,
      ProductivityBenchmarksResolver,
      FinancialPerformanceResolver,
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
      RateBuildupTemplateResolver,
      TenderResolver,
      TenderPricingSheetResolver,
      TenderReviewResolver,
      PublicDocumentResolver,
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
          // Invalid / expired token — treat as unauthenticated rather than
          // failing context creation (which causes a 500 that the client
          // misreads as the server being unreachable).
          return { user: null, req, res };
        }

        const decoded = jwt.decode(token);

        user = await User.getById((decoded as jwt.JwtPayload)?.userId);
      }

      // Enrich the ALS RequestContext with userId + sessionId so GraphQL
      // resolvers downstream see them when emitting DomainEvents.
      const existing = getRequestContext();
      if (existing) {
        const decoded =
          token && process.env.JWT_SECRET
            ? (jwt.decode(token) as jwt.JwtPayload | null)
            : null;
        const enriched: RequestContext = {
          ...existing,
          userId: user?._id?.toString() ?? existing.userId,
          sessionId:
            (decoded && typeof decoded.sessionId === "string"
              ? decoded.sessionId
              : undefined) ?? existing.sessionId,
        };
        runWithContext(enriched, () => undefined);
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
      maxFileSize: 500000000, // 500mb
      maxFiles: 20,
    })
  );

  app.get("/health", (_req, res) => res.sendStatus(200));

  app.use("/file", fileRouter);
  app.use("/public", publicDocumentsRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/conversations", conversationsRouter);
  app.use("/api/tender-chat", tenderChatRouter);
  app.use("/api/foreman-jobsite-chat", foremanJobsiteChatRouter);
  app.use("/api/pm-jobsite-chat", pmJobsiteChatRouter);
  app.use("/api/tender-conversations", tenderConversationsRouter);
  app.use("/api/enriched-files", enrichedFilesRouter);
  app.use("/api/developer", developerRouter);

  // Sparse index for developer ratings query — non-blocking, safe to re-run
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Conversation.collection as any)
    .createIndex({ "messages.rating": 1 }, { sparse: true, background: true })
    .catch((err: { message: string }) =>
      console.warn("Conversation ratings index:", err.message)
    );

  await apolloServer.start();

  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  return httpServer;
};

export default createApp;
