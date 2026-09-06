import { randomUUID } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { createGameRoomRepository } from "./game-room-repository.js";

const ROOM_TTL_SECONDS = 10 * 60;

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

export const createCreateRoomHandler = (gameRoomRepository) => async (event) => {
  if (!hasJsonContentType(event?.headers)) {
    return jsonResponse(400, { message: "Invalid content type." });
  }

  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch {
    return jsonResponse(400, { message: "Request body must be valid JSON." });
  }

  const name = typeof requestBody?.name === "string"
    ? requestBody.name.trim()
    : "";
  if (!name) {
    return jsonResponse(400, { message: "name is required." });
  }

  const roomId = randomUUID();
  const currentTime = Date.now();
  const room = {
    pk: `ROOM#${roomId}`,
    type: "game-room",
    roomId,
    name,
    status: "waiting",
    createdAt: new Date(currentTime).toISOString(),
    expiresAt: Math.floor(currentTime / 1000) + ROOM_TTL_SECONDS,
  };

  try {
    await gameRoomRepository.create(room);
  } catch (error) {
    console.error("Error creating room:", error);
    return jsonResponse(500, { message: "Error creating room." });
  }

  return jsonResponse(201, {
    roomId: room.roomId,
    name: room.name,
    status: room.status,
    expiresAt: room.expiresAt,
  });
};

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const gameRoomRepository = createGameRoomRepository({
  documentClient,
  tableName: process.env.GAME_ROOM_TABLE_NAME,
});

export const handler = createCreateRoomHandler(gameRoomRepository);
