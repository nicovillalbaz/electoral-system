import { FastifyInstance } from "fastify";
import { z } from "zod";
import { notFound } from "../../common/http/errors";
import { tasksList, taskCreate, taskUpdate, taskDelete, taskCompleteWithExpense } from "./tasks.repo";

export async function tasksRoutes(app: FastifyInstance) {
  // 1. LIST TASKS
  app.get("/", { preHandler: [app.requireAuth] }, async (req: any) => {
    const queryZ = z.object({
      q: z.string().optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
      taskType: z.enum(['VISIT', 'CALL', 'EVENT', 'LOGISTICS', 'FINANCIAL', 'TRANSPORT', 'FOOD', 'OTHER']).optional(),
      assignedUserId: z.string().uuid().optional(),
      relatedPersonId: z.string().uuid().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      status: z.enum(["PENDING", "COMPLETED", "ALL"]).optional(),
      page: z.coerce.number().min(1).optional(),
      limit: z.coerce.number().min(1).optional(),
    }).parse(req.query);

    const campaignId = req.user.campaignId;
    const limit = Math.min(queryZ.limit ?? 50, 200);
    return tasksList(campaignId, { ...queryZ, limit });
  });

  // 2. CREATE TASK
  app.post("/", { preHandler: [app.requireAuth] }, async (req: any) => {
    const body = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
      taskType: z.enum(['VISIT', 'CALL', 'EVENT', 'LOGISTICS', 'FINANCIAL', 'TRANSPORT', 'FOOD', 'OTHER']).optional(),
      dueDate: z.string().datetime().optional(),
      assignedUserId: z.string().uuid().optional(),
      relatedPersonId: z.string().uuid().optional(),
      relatedListId: z.string().uuid().optional(),
      locationText: z.string().optional(),
      locationLat: z.number().optional(),
      locationLng: z.number().optional(),
    }).parse(req.body);

    const campaignId = req.user.campaignId;
    return taskCreate(campaignId, req.user.userId, body);
  });

  // 3. UPDATE TASK
  app.patch("/:id", { preHandler: [app.requireAuth] }, async (req: any) => {
    const params = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
      taskType: z.enum(['VISIT', 'CALL', 'EVENT', 'LOGISTICS', 'FINANCIAL', 'TRANSPORT', 'FOOD', 'OTHER']).optional(),
      dueDate: z.string().datetime().optional(),
      assignedUserId: z.string().uuid().optional(),
      completed: z.boolean().optional(),
    }).parse(req.body);

    const campaignId = req.user.campaignId;
    const updated = await taskUpdate(campaignId, params.id, body);
    if (!updated) throw notFound("Task not found");
    return updated;
  });

  // 4. DELETE TASK
  app.delete("/:id", { preHandler: [app.requireAuth] }, async (req: any) => {
    const params = z.object({ id: z.string().uuid() }).parse(req.params);
    const campaignId = req.user.campaignId;
    const success = await taskDelete(campaignId, params.id);
    if (!success) throw notFound("Task not found");
    return { success: true };
  });

  // 5. COMPLETE FINANCIAL TASK
  app.post("/:id/complete-financial", { preHandler: [app.requireAuth] }, async (req: any) => {
      const params = z.object({ id: z.string().uuid() }).parse(req.params);
      const body = z.object({
          amount: z.number().min(0),
          concept: z.string().min(1)
      }).parse(req.body);

      const campaignId = req.user.campaignId;
      return taskCompleteWithExpense(campaignId, params.id, {
          amount: body.amount,
          concept: body.concept,
          userId: req.user.userId
      });
  });
}
