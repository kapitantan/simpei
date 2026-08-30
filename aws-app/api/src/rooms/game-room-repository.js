import { PutCommand } from "@aws-sdk/lib-dynamodb";

export const createGameRoomRepository = ({ documentClient, tableName }) => ({
  async create(room) {
    if (!tableName) {
      throw new Error("GAME_ROOM_TABLE_NAME is not configured.");
    }

    await documentClient.send(new PutCommand({
      TableName: tableName,
      Item: room,
      ConditionExpression: "attribute_not_exists(pk)",
    }));
  },
});
