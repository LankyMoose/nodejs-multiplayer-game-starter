import type { Contract } from "./contract.js";
import type { Transport } from "./transport.js";

type Requests<C extends Contract<any, any>> = C["clientToServer"]["request"];

// Constrain each request to { req: any; res: any }
type KeysWithPayload<R extends Record<string, { req: any; res: any }>> = {
  [K in keyof R]: R[K]["req"] extends void ? never : K;
}[keyof R];

type KeysWithoutPayload<R extends Record<string, { req: any; res: any }>> = {
  [K in keyof R]: R[K]["req"] extends void ? K : never;
}[keyof R];

export interface ClientRouter<C extends Contract<any, any>> {
  send<K extends KeysWithoutPayload<Requests<C>>>(
    type: K
  ): Promise<Requests<C>[K]["res"]>;
  send<K extends KeysWithPayload<Requests<C>>>(
    type: K,
    payload: Requests<C>[K]["req"]
  ): Promise<Requests<C>[K]["res"]>;

  on<K extends keyof C["serverToClient"]["events"]>(
    type: K,
    handler: (payload: C["serverToClient"]["events"][K]) => void
  ): () => void;

  dispose: () => void;
}

export function createClientRouter<C extends Contract<any, any>>(
  transport: Transport
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
    send<K extends keyof C["clientToServer"]["request"]>(
      type: K,
      payload?: C["clientToServer"]["request"][K]["req"]
    ) {
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

    on<K extends keyof C["serverToClient"]["events"]>(
      type: K,
      handler: (payload: C["serverToClient"]["events"][K]) => void
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
