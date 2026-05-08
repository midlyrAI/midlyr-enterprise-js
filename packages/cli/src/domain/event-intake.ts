import type { CreateEventRequest } from "@midlyr/sdk-js";
import type { MidlyrClient } from "../sdk/midlyr-client.js";

type EventIntakeClient = Pick<MidlyrClient, "createEvent">;

export interface EventIntakeInput {
  body: CreateEventRequest;
}

export class EventIntakeService {
  constructor(private readonly client: EventIntakeClient) {}

  async run(input: EventIntakeInput) {
    return this.client.createEvent(input.body);
  }
}
