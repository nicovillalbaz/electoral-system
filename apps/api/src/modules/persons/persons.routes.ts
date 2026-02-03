import { FastifyInstance } from "fastify";
import { z } from "zod";
import { notFound } from "../../common/http/errors";
import { requireRole } from "../../common/middleware/role";
import {
  personsList,
  personGet,
  personCreate,
  personUpdate,
  personsGetUniqueAddresses,
} from "./persons.repo";
import {
  VOTE_INTENT_OPTIONS,
  CAMPAIGN_STATUS_OPTIONS,
  TRANSPORT_STATUS_OPTIONS,
} from "../../common/constants/campaign";
export async function personsRoutes(app: FastifyInstance) {
  // --- 1. GET LISTADO (Con Paginación, Filtros y Orden) ---
  // --- NUEVO: LISTA DE DIRECCIONES PARA EL FILTRO ---
  app.get("/addresses", { preHandler: [app.requireAuth] }, async (req: any) => {
    const campaignId = req.user.campaignId;
    return personsGetUniqueAddresses(campaignId);
  });
  app.get("/", { preHandler: [app.requireAuth] }, async (req: any) => {
    const queryZ = z
      .object({
        q: z.string().optional(),
        page: z.coerce.number().min(1).optional(),
        limit: z.coerce.number().min(1).optional(),
        sortBy: z.string().optional(),
        sortDir: z.enum(["ASC", "DESC"]).optional(),
        // Filtros nuevos
        address: z.string().optional(),
        party: z.string().optional(),
        voteIntent: z.string().optional(),
        votedStatus: z.string().optional(),
        visitedStatus: z.string().optional(),
        tagId: z.string().optional(),
      })
      .parse(req.query);

    // Y pásalos a personsList(...)

    const campaignId = req.user.campaignId;
    const res = await personsList(campaignId, {
      q: queryZ.q,
      page: queryZ.page,
      limit: queryZ.limit,
      sortBy: queryZ.sortBy,
      sortDir: queryZ.sortDir as "ASC" | "DESC",
      address: queryZ.address,
      party: queryZ.party,
      voteIntent: queryZ.voteIntent,
      votedStatus: queryZ.votedStatus,
      visitedStatus: queryZ.visitedStatus,
      tagId: queryZ.tagId,
    });
    return res;
  });

  // --- 2. GET POR ID ---
  app.get("/:id", { preHandler: [app.requireAuth] }, async (req: any) => {
    const params = z.object({ id: z.string().uuid() }).parse(req.params);
    const campaignId = req.user.campaignId;
    const res = await personGet(campaignId, params.id);
    if (!res.rows[0]) throw notFound("Person not found");
    return res.rows[0];
  });

  // --- 3. CREAR PERSONA (COMPLETO) ---
  app.post(
    "/",
    {
      preHandler: [
        app.requireAuth,
        requireRole(["ADMIN", "COORDINATOR", "OPERATOR"]),
      ],
    },
    async (req: any) => {
      const body = z
        .object({
          documentId: z.string().min(3),
          firstName: z.string().min(1),
          lastName: z.string().min(1),
          phoneNumber: z.string().optional(),
          address: z.string().optional(),
          department: z.string().optional(),
          district: z.string().optional(),
          pollingPlace: z.string().optional(),
          tableNumber: z.coerce.number().optional(),
          orderNumber: z.coerce.number().optional(),
          partyAffiliation: z.string().optional(),
          currentVoteIntent: z
            .enum([
              "SURE",
              "PROBABLE",
              "OPPOSITION",
              "OPPOSITION_INTERNAL",
              "OPPOSITION_PARTY",
              "WONT_VOTE",
              "UNDECIDED",
            ])
            .optional(),
          notes: z.string().optional(),
        })
        .parse(req.body);

      const campaignId = req.user.campaignId;
      const res = await personCreate(campaignId, body);
      return res;
    },
  );

  // --- 4. ACTUALIZAR PERSONA (EDICIÓN 360°) ---
  app.patch(
    "/:id",
    {
      preHandler: [
        app.requireAuth,
        requireRole(["ADMIN", "COORDINATOR", "OPERATOR"]),
      ],
    },
    async (req: any) => {
      const params = z.object({ id: z.string().uuid() }).parse(req.params);

      const body = z
        .object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          phoneNumber: z.string().optional(),
          address: z.string().optional(),

          department: z.string().optional(),
          district: z.string().optional(),
          pollingPlace: z.string().optional(),
          tableNumber: z.coerce.number().optional(),
          orderNumber: z.coerce.number().optional(),
          partyAffiliation: z.string().optional(),

          // VALIDACIÓN CORRECTA:
          // Aceptamos: Uno de los valores válidos OR un string vacío OR null OR undefined
          currentVoteIntent: z
            .enum(VOTE_INTENT_OPTIONS)
            .or(z.literal(""))
            .nullable()
            .optional(),

          notes: z.string().optional(),

          // Nuevos Estados con la misma lógica robusta
          campaignStatus: z
            .enum(CAMPAIGN_STATUS_OPTIONS)
            .or(z.literal(""))
            .nullable()
            .optional(),

          needsTransport: z.boolean().optional(),

          transportStatus: z
            .enum(TRANSPORT_STATUS_OPTIONS)
            .or(z.literal(""))
            .nullable()
            .optional(),
        })
        .parse(req.body);

      const campaignId = req.user.campaignId;

      // Llamamos al repo. El repo se encargará de convertir "" en null.
      const res = await personUpdate(
        campaignId,
        params.id,
        body,
        req.user.userId,
      );

      if (!res) throw notFound("Person not found");
      return res;
    },
  );
}
