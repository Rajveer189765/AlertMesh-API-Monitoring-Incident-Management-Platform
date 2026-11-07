const { z } = require("zod");

const createMonitorSchema = z.object({
    serviceId: z.string().uuid(),
    name: z.string().trim().min(1).max(100),
    url: z.string().url().max(2048),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"),
    expectedStatusCode: z.number().int().min(100).max(599).default(200),
    timeoutMs: z.number().int().min(1).max(60000).default(5000),
    intervalSeconds: z.number().int().min(10).max(86400).default(60),
    failureThreshold: z.number().int().min(1).max(20).default(3),
    recoveryThreshold: z.number().int().min(1).max(20).default(2)
});

const updateMonitorSchema = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    url: z.string().url().max(2048).optional(),

    method: z.enum([
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE"
    ]).optional(),

    expectedStatusCode: z.number().int().min(100).max(599).optional(),
    timeoutMs: z.number().int().min(1).max(60000).optional(),
    intervalSeconds: z.number().int().min(10).max(86400).optional(),
    failureThreshold: z.number().int().min(1).max(20).optional(),
    recoveryThreshold: z.number().int().min(1).max(20).optional(),
    enabled: z.boolean().optional()
}).strict().refine(
    (data) => Object.keys(data).length > 0,
    {
        message: "At least one field must be provided"
    }
);

module.exports = {
    createMonitorSchema,
    updateMonitorSchema
};