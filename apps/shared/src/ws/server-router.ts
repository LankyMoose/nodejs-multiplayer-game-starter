import type { Contract } from "./contract.js";
import type { Transport } from "./transport.js";

export type ServerHandlers<C extends Contract<any>> = {
  [K in keyof C["rpc"]]: "req" extends keyof C["rpc"][K]
    ? (
        payload: C["rpc"][K]["req"],
      ) => Promise<C["rpc"][K]["res"]> | C["rpc"][K]["res"]
    : () => Promise<C["rpc"][K]["res"]> | C["rpc"][K]["res"];
};

export interface ServerRouter<C extends Contract<any>> {
  emit<K extends keyof C["serverEvents"]>(
    type: K,
    payload: C["serverEvents"][K],
  ): void;
  dispose: () => void;
}

export function createServerRouter<C extends Contract<any>>(
  transport: Transport,
  handlers: ServerHandlers<C>,
): ServerRouter<C> {
  const disposeTransport = transport.onMessage(async (message) => {
    if (message.kind !== "request") return;

    const handler = handlers[message.type];

    if (!handler) {
      // optional: send error response
      return;
    }

    const result = await handler(message.payload);

    transport.send({
      kind: "response",
      id: message.id,
      type: message.type,
      payload: result,
    });
  });

  return {
    emit<K extends keyof C["serverEvents"]>(
      type: K,
      payload: C["serverEvents"][K],
    ) {
      transport.send({
        kind: "event",
        type: type as string,
        payload,
      });
    },
    dispose() {
      disposeTransport();
    },
  };
}
