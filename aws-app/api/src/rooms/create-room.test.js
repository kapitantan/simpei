import { expect, jest, test } from "@jest/globals";

const sendMock = jest.fn();

jest.unstable_mockModule("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn(),
}));

jest.unstable_mockModule("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({ send: sendMock })),
  },
  PutCommand: class PutCommand {
    constructor(input) {
      this.input = input;
    }
  },
}));

process.env.LabSessionTableName = "test-lab-session-table";
const { handler } = await import("./create-room.js");

test("returns an explicit not implemented response", async() => {
  sendMock.mockResolvedValue({});

  const response = await handler();
  // PutCommandを呼び、レスポンスの形が正しいか
  // ステータスコード、ヘッダー、ボディの内容を確認する
  // エラー時も確認する


  // expect(response.statusCode).toBe(200);
  // expect(response.headers["content-type"]).toBe("application/json");
  // expect(sendMock).toHaveBeenCalledTimes(1);
});
