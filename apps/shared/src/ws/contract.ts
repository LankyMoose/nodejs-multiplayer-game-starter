type ServerEventsMap = Record<string, any>;

type RpcDefinition = {
  req?: any;
  res: any;
};

type RpcMap = Record<string, RpcDefinition>;

export interface ContractDefinition {
  rpc: RpcMap;
  serverEvents: ServerEventsMap;
}

export interface Contract<T extends ContractDefinition> {
  rpc: T["rpc"];
  serverEvents: T["serverEvents"];
}
