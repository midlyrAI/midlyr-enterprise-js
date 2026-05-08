import type { ScreenAnalysisScenario } from "./scenario.js";

export interface EventTextContent {
  type: "text";
  text: string;
}

export interface EventJsonContent {
  type: "json";
  json: Record<string, unknown>;
}

export type EventContent = EventTextContent | EventJsonContent;

export interface CreateEventRequest {
  scenario: ScreenAnalysisScenario;
  content: EventContent;
  externalRef?: string;
}

export interface CreateEventResponse {
  ticketId: string;
  externalRef?: string;
  created: boolean;
}
