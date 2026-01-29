export type JwtUser = {
  userId: string;
  campaignId: string;
  role: "ADMIN" | "COORDINATOR" | "STATION_MANAGER" | "OPERATOR" | "VOLUNTEER" | "VIEWER";
  email: string;
};
