import assert from "node:assert/strict";
import test from "node:test";
import { handler } from "./create-room.js";

test("returns an explicit not implemented response", async () => {
  const response = await handler();

  assert.equal(response.statusCode, 501);
  assert.equal(response.headers["content-type"], "application/json");
  assert.deepEqual(JSON.parse(response.body), {
    message: "Room creation is not implemented yet.",
  });
});
