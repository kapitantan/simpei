import assert from "node:assert/strict";
import test from "node:test";
import { handler } from "./create-room.js";

test("returns an explicit not implemented response", async () => {
  const response = await handler();

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["content-type"], "application/json");
});
