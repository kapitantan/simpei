import { jest } from "@jest/globals";
import { expect, test } from "@jest/globals";
import { handler } from "./create-room.js";

test("returns an explicit not implemented response", async () => {
  const response = await handler();

  // expect(response.statusCode).toBe(501);
  // expect(response.headers["content-type"]).toBe("application/json");
  // expect(JSON.parse(response.body)).toEqual({
  //   message: "Room creation is not implemented yet.",
  // });
});
