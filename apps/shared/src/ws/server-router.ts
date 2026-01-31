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

export interface ServerRouterOptions {
  onHandlerError?: (error: any) => void;
  onInvalidMessageType?: (message: any) => void;
}

export function createServerRouter<C extends Contract<any>>(
  transport: Transport,
  handlers: ServerHandlers<C>,
  options?: ServerRouterOptions,
): ServerRouter<C> {
  const disposeTransport = transport.onMessage(async (message) => {
    if (message.kind !== "request") return;

    const handler = handlers[message.type];

    if (!handler) {
      options?.onInvalidMessageType?.(message);
      return;
    }

    try {
      const result = await handler(message.payload);
      transport.send({
        kind: "response",
        id: message.id,
        type: message.type,
        payload: result,
      });
    } catch (error) {
      options?.onHandlerError?.(error);
      // no information about the internal error is sent, this is by design.
      transport.send({
        kind: "error",
        id: message.id,
        message: "Internal error",
      });
    }
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
