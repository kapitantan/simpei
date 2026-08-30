import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const LabSessionTableName = process.env.LabSessionTableName;

export const handler = async () => {
  try {
    console.log("Create room handler invoked.");
    const command = new PutCommand({
      TableName: LabSessionTableName,
      Item: {
        pk: "TICKET#ticket-123",
        type: "lab-ticket",
        ticketId: "ticket-123",
        browserSessionId: "browser-abc",
        status: "waiting",
        matchId: null,
        role: null,
        createdAt: new Date().toISOString(),
        expiresAt: Math.floor(Date.now() / 1000) + 600      
      }
    });
  
    const response = await docClient.send(command);
    console.log(response);
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: "Room creation is not implemented yet.",
      }),
    };
  } catch (error) {
    console.error("Error creating room:", error);
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        message: "Error creating room.",
      }),
    };
  }
};
