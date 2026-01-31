type RequestMessage<K extends string, P> = {
  kind: "request";
  id: string;
  type: K;
  payload: P;
};

type RequestErrorMessage = {
  kind: "error";
  id: string;
  message: string;
};

type ResponseMessage<K extends string, P> = {
  kind: "response";
  id: string;
  type: K;
  payload: P;
};

type EventMessage<K extends string, P> = {
  kind: "event";
  type: K;
  payload: P;
};

export type WireMessage =
  | RequestErrorMessage
  | RequestMessage<string, any>
  | ResponseMessage<string, any>
  | EventMessage<string, any>;

export interface Transport {
  send(message: WireMessage): void;
  onMessage(cb: (message: WireMessage) => void): () => void;
}
