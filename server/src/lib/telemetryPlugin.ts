import {
  ApolloServerPlugin,
  GraphQLRequestContextWillSendResponse,
} from "apollo-server-plugin-base";
import { User } from "@models";
import { getRequestContext } from "@lib/requestContext";
import {
  recordOpTiming,
  recordErrorWithAlert,
} from "./telemetryDb";

export const telemetryPlugin: ApolloServerPlugin = {
  async requestDidStart() {
    const start = Date.now();

    return {
      async didEncounterErrors(context) {
        const ctx = getRequestContext();
        const userId = ctx?.userId;

        let userName: string | undefined;
        let userEmail: string | undefined;
        if (userId) {
          try {
            const user = await User.getById(userId);
            userName = user?.name ?? undefined;
            userEmail = user?.email ?? undefined;
          } catch {
            // silent — don't let user lookup failure suppress error capture
          }
        }

        for (const error of context.errors) {
          recordErrorWithAlert({
            source: "graphql",
            operation: context.operationName ?? undefined,
            errorMessage: error.message,
            errorCode: error.extensions?.code as string | undefined,
            traceId: ctx?.traceId,
            userId,
            userName,
            userEmail,
          }).catch(() => {});
        }
      },

      async willSendResponse(
        ctx: GraphQLRequestContextWillSendResponse<Record<string, unknown>>
      ) {
        const durationMs = Date.now() - start;
        const hadErrors =
          ctx.errors != null && ctx.errors.length > 0;
        const status = hadErrors ? "error" : "ok";

        if (durationMs <= 2000 && status === "ok") return;

        const reqCtx = getRequestContext();
        recordOpTiming({
          operationName: ctx.operationName ?? "anonymous",
          durationMs,
          status,
          traceId: reqCtx?.traceId,
        }).catch(() => {});
      },
    };
  },
};
