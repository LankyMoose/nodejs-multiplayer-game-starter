import type { Contract } from "./contract.js";
import type { Transport } from "./transport.js";

type RpcKeysWithPayload<C extends Contract<any>> = {
  [K in keyof C["rpc"]]: "req" extends keyof C["rpc"][K] ? K : never;
}[keyof C["rpc"]];

type RpcKeysWithoutPayload<C extends Contract<any>> = {
  [K in keyof C["rpc"]]: "req" extends keyof C["rpc"][K] ? never : K;
}[keyof C["rpc"]];

export interface ClientRouter<C extends Contract<any>> {
  send<K extends RpcKeysWithoutPayload<C>>(
    type: K,
  ): Promise<C["rpc"][K]["res"]>;

  send<K extends RpcKeysWithPayload<C>>(
    type: K,
    payload: C["rpc"][K]["req"],
  ): Promise<C["rpc"][K]["res"]>;

  on<K extends keyof C["serverEvents"]>(
    type: K,
    handler: (payload: C["serverEvents"][K]) => void,
  ): () => void;

  dispose: () => void;
}

export function createClientRouter<C extends Contract<any>>(
  transport: Transport,
): ClientRouter<C> {
  const pending = new Map<string, (value: any) => void>();
  const listeners = new Map<string, Set<(payload: any) => void>>();

  const disposeTransport = transport.onMessage((message) => {
    if (message.kind === "response") {
      pending.get(message.id)?.(message.payload);
      pending.delete(message.id);
    }

    if (message.kind === "event") {
      listeners.get(message.type)?.forEach((fn) => fn(message.payload));
    }
  });

  return {
    send<K extends keyof C["rpc"]>(type: K, payload?: C["rpc"][K]["req"]) {
      const id = crypto.randomUUID();

      transport.send({
        kind: "request",
        id,
        type: type as string,
        payload,
      });

      return new Promise((resolve) => {
        pending.set(id, resolve);
      });
    },

    on<K extends keyof C["serverEvents"]>(
      type: K,
      handler: (payload: C["serverEvents"][K]) => void,
    ) {
      const key = type as string;
      if (!listeners.has(key)) listeners.set(key, new Set());

      const l = listeners.get(key);
      l!.add(handler);
      return () => l!.delete(handler);
    },

    dispose() {
      disposeTransport();
    },
  };
}
