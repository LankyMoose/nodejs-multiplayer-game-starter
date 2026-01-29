import type { Contract } from "./contract.js";
import type { Transport } from "./transport.js";

export type ServerHandlers<C extends Contract<any, any>> = {
  [K in keyof C["clientToServer"]["request"]]: (
    payload: C["clientToServer"]["request"][K]["req"]
  ) =>
    | Promise<C["clientToServer"]["request"][K]["res"]>
    | C["clientToServer"]["request"][K]["res"];
};

export interface ServerRouter<C extends Contract<any, any>> {
  emit<K extends keyof C["serverToClient"]["events"]>(
    type: K,
    payload: C["serverToClient"]["events"][K]
  ): void;
  dispose: () => void;
}

export function createServerRouter<C extends Contract<any, any>>(
  transport: Transport,
  handlers: ServerHandlers<C>
): ServerRouter<C> {
  const disposeTransport = transport.onMessage(async (message) => {
    if (message.kind !== "request") return;

    const handler = handlers[message.type as keyof typeof handlers];

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
    emit<K extends keyof C["serverToClient"]["events"]>(
      type: K,
      payload: C["serverToClient"]["events"][K]
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
