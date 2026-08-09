import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACTION_TYPES,
  PLAYERS,
  WORLDS,
  applyAction,
  createInitialGame,
  getLegalPlacementTargets,
  getPositionId,
} from "./simpei.js";

describe("AWS local game", () => {
  it("starts with a browser-only local match", () => {
    const game = createInitialGame();

    assert.equal(game.currentPlayer, PLAYERS.RED);
    assert.equal(game.phase, "placement");
    assert.equal(getLegalPlacementTargets(game).length, 4);
  });

  it("applies a legal first move without a server", () => {
    const game = createInitialGame();
    const target = getPositionId(WORLDS.UPPER, 1, 1);
    const nextGame = applyAction(game, { type: ACTION_TYPES.PLACE, to: target });

    assert.equal(nextGame.board[target], PLAYERS.RED);
    assert.equal(nextGame.currentPlayer, PLAYERS.BLUE);
  });
});
