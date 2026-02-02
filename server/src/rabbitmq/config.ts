/**
 * RabbitMQ configuration constants
 *
 * Architecture:
 *   - Topic exchange for flexible routing
 *   - Routing keys: {entity}.{action} (e.g., employee.updated, daily_report.created)
 *   - Queues bound by entity pattern (e.g., sync.employee binds to employee.*)
 */

export const RABBITMQ_CONFIG = {
  /** Connection settings (from environment or defaults for dev) */
  connection: {
    hostname: process.env.RABBITMQ_HOST || "rabbitmq",
    port: parseInt(process.env.RABBITMQ_PORT || "5672"),
    username: process.env.RABBITMQ_USER || "bowmark",
    password: process.env.RABBITMQ_PASSWORD || "devpassword",
    vhost: process.env.RABBITMQ_VHOST || "bowmark",
  },

  /** Main exchange for sync events */
  exchange: {
    name: "bowmark.sync",
    type: "topic" as const,
    options: {
      durable: true,
    },
  },

  /** Queue definitions with their routing key bindings */
  queues: {
    employee: {
      name: "sync.employee",
      bindings: ["employee.*"],
      options: {
        durable: true,
      },
    },
    jobsite: {
      name: "sync.jobsite",
      bindings: ["jobsite.*"],
      options: {
        durable: true,
      },
    },
    dailyReport: {
      name: "sync.daily_report",
      bindings: ["daily_report.*", "crew.*"],
      options: {
        durable: true,
      },
    },
    employeeWork: {
      name: "sync.employee_work",
      bindings: ["employee_work.*"],
      options: {
        durable: true,
      },
    },
    vehicleWork: {
      name: "sync.vehicle_work",
      bindings: ["vehicle_work.*"],
      options: {
        durable: true,
      },
    },
  },
} as const;

/**
 * Routing keys for publishing events
 */
export const ROUTING_KEYS = {
  employee: {
    created: "employee.created",
    updated: "employee.updated",
    deleted: "employee.deleted",
  },
  jobsite: {
    created: "jobsite.created",
    updated: "jobsite.updated",
    deleted: "jobsite.deleted",
  },
  crew: {
    created: "crew.created",
    updated: "crew.updated",
    deleted: "crew.deleted",
  },
  dailyReport: {
    created: "daily_report.created",
    updated: "daily_report.updated",
    deleted: "daily_report.deleted",
  },
  employeeWork: {
    created: "employee_work.created",
    updated: "employee_work.updated",
    deleted: "employee_work.deleted",
  },
  vehicleWork: {
    created: "vehicle_work.created",
    updated: "vehicle_work.updated",
    deleted: "vehicle_work.deleted",
  },
} as const;

export type EntityType = keyof typeof ROUTING_KEYS;
export type ActionType = "created" | "updated" | "deleted";
