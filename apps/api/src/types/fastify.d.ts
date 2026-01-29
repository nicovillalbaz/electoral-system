import "@fastify/jwt";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: {
      userId: string;
      campaignId: string;
      role: "ADMIN" | "COORDINATOR" | "STATION_MANAGER" | "OPERATOR" | "VOLUNTEER" | "VIEWER";
      email: string;
    };
  }
}
