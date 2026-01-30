import type { Contract } from "./ws/contract.js";

export type WebSocketContract = Contract<{
  serverEvents: {
    "user:disconnect": string;
    "match:started": string;
  };
  rpc: {
    ping: { res: "pong" };
    "match:join": { req: { id: string }; res: { success: boolean } };
  };
}>;
