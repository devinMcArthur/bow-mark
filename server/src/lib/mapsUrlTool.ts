import Anthropic from "@anthropic-ai/sdk";
import { ToolExecutionResult } from "./streamConversation";

export const MAPS_URL_TOOL: Anthropic.Tool = {
  name: "get_maps_url",
  description:
    "Generate Google Maps URLs for a location — satellite view and Street View. " +
    "Use this when the user asks about site conditions, surroundings, access, or anything that would benefit from seeing the physical location. " +
    "You can derive the location from the tender documents (address, intersection, coordinates) or ask the user if unclear.",
  input_schema: {
    type: "object" as const,
    properties: {
      location: {
        type: "string",
        description:
          "The location to look up. Can be a street address, intersection (e.g. 'Main St & 1st Ave, Edmonton, AB'), " +
          "a description with city/province, or decimal coordinates (e.g. '53.5461,-113.4938').",
      },
    },
    required: ["location"],
  },
};

export async function mapsUrlExecutor(
  _name: string,
  rawInput: Record<string, unknown>
): Promise<ToolExecutionResult> {
  const { location } = rawInput as { location: string };
  const encoded = encodeURIComponent(location);

  const satelliteUrl = `https://maps.google.com/maps?q=${encoded}&t=k`;
  const streetViewUrl = `https://www.google.com/maps/search/${encoded}`;

  const text =
    `Here are Google Maps links for **${location}**:\n\n` +
    `- [Satellite view](${satelliteUrl})\n` +
    `- [Street View / Standard map](${streetViewUrl})\n\n` +
    `Open either link to explore the site. Satellite view is useful for understanding site layout, access routes, and surrounding features.`;

  return { content: text, summary: `Generated maps links for: ${location}` };
}
