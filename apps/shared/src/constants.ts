import { WebSocketContractBuilder } from "./ws/contract.js";

const contract = new WebSocketContractBuilder()
  .serverEvents<{
    "user:disconnect": string;
    "match:started": string;
  }>()
  .clientRequests<{
    ping: { res: "pong" };
    "match:join": { req: { id: string }; res: { success: boolean } };
  }>()
  .build();

export type WebSocketContract = typeof contract;
