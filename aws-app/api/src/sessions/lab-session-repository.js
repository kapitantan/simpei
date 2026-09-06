import { PutCommand } from "@aws-sdk/lib-dynamodb";

export const createLabSessionRepository = ({ documentClient, tableName }) => ({
  async create(session) {
    if (!tableName) {
      throw new Error("LAB_SESSION_TABLE_NAME is not configured.");
    }

    await documentClient.send(new PutCommand({
      TableName: tableName,
      Item: session,
      ConditionExpression: "attribute_not_exists(pk)",
    }));
  },
});
