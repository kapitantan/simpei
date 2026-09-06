import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { createLabSessionRepository } from "./lab-session-repository.js";

const LAB_TICKET_TTL_SECONDS = 5 * 60;

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    "content-type": "application/json",
  },
  body: JSON.stringify(body),
});

const hasJsonContentType = (headers = {}) => {
  const contentType = headers["content-type"] ?? headers["Content-Type"];
  return contentType?.split(";", 1)[0].trim().toLowerCase() === "application/json";
};

export const createCreateSessionHandler = ({
  labSessionRepository,
  now = Date.now,
}) => async (event) => {
  if (!hasJsonContentType(event?.headers)) {
    return jsonResponse(400, { message: "Invalid content type." });
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch {
    return jsonResponse(400, { message: "Request body must be valid JSON." });
  }

  const ticketId = typeof requestBody?.ticketId === "string"
    ? requestBody.ticketId.trim()
    : "";
  const browserSessionId = typeof requestBody?.browserSessionId === "string"
    ? requestBody.browserSessionId.trim()
    : "";
  if (!ticketId || !browserSessionId) {
    return jsonResponse(400, {
      message: "ticketId and browserSessionId are required.",
    });
  }

  const currentTime = now();
  const ticket = {
    pk: `TICKET#${ticketId}`,
    type: "lab-ticket",
    ticketId,
    browserSessionId,
    status: "waiting",
    matchId: null,
    role: null,
    createdAt: new Date(currentTime).toISOString(),
    expiresAt: Math.floor(currentTime / 1000) + LAB_TICKET_TTL_SECONDS,
  };

  try {
    await labSessionRepository.create(ticket);
  } catch (error) {
    console.error("Error creating session:", error);
    return jsonResponse(500, { message: "Error creating session." });
  }

  return jsonResponse(201, {
    ticketId: ticket.ticketId,
    browserSessionId: ticket.browserSessionId,
    status: ticket.status,
    matchId: ticket.matchId,
    role: ticket.role,
    expiresAt: ticket.expiresAt,
  });
};

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const labSessionRepository = createLabSessionRepository({
  documentClient,
  tableName: process.env.LAB_SESSION_TABLE_NAME,
});

export const handler = createCreateSessionHandler({ labSessionRepository });
