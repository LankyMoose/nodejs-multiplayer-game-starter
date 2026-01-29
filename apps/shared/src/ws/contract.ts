type EventMap = Record<string, any>;

type RequestDef = {
  req?: any;
  res: any;
};

type RequestMap = Record<string, RequestDef>;

type NormalizedRequestMap<T extends RequestMap> = {
  [K in keyof T]: {
    req: "req" extends keyof T[K] ? T[K]["req"] : void;
    res: T[K]["res"];
  };
};

export interface Contract<
  ClientReq extends RequestMap,
  ServerEvents extends EventMap
> {
  clientToServer: {
    request: ClientReq;
  };
  serverToClient: {
    events: ServerEvents;
  };
}

export class WebSocketContractBuilder<
  ClientReq extends RequestMap = {},
  ServerEvents extends EventMap = {}
> {
  clientRequests<R extends RequestMap>(): WebSocketContractBuilder<
    ClientReq & NormalizedRequestMap<R>,
    ServerEvents
  > {
    return this as any;
  }

  serverEvents<E extends EventMap>(): WebSocketContractBuilder<
    ClientReq,
    ServerEvents & E
  > {
    return this as any;
  }

  build(): Contract<ClientReq, ServerEvents> {
    return {} as any;
  }
}
