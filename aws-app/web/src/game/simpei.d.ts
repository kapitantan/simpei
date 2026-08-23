export type Player = "red" | "blue";
export type World = "upper" | "lower";
export type GamePhase = "placement" | "movement";
export type DrawReason = "moveLimit" | "repetition";
export type ActionType = "place" | "move" | "forceMove" | "pass";
export type PositionId = string;

export interface Position {
  id: PositionId;
  world: World;
  row: number;
  col: number;
}

export interface ForcedPiece {
  from: PositionId;
  player: Player;
}

export interface PendingForcedMove {
  player: Player;
  pieces: [ForcedPiece, ...ForcedPiece[]];
}

export interface GameState {
  board: Record<PositionId, Player | null>;
  currentPlayer: Player;
  turnNumber: number;
  placedCount: Record<Player, number>;
  phase: GamePhase;
  pendingForcedMove: PendingForcedMove | null;
  winner: Player | null;
  winningLine: PositionId[] | null;
  drawReason: DrawReason | null;
  message: string;
}

export interface GameAction {
  type: ActionType;
  from?: PositionId;
  to?: PositionId;
}

export const PLAYERS: { readonly RED: "red"; readonly BLUE: "blue" };
export const WORLDS: { readonly UPPER: "upper"; readonly LOWER: "lower" };
export const ACTION_TYPES: {
  readonly PLACE: "place";
  readonly MOVE: "move";
  readonly FORCE_MOVE: "forceMove";
  readonly PASS: "pass";
};
export const POSITIONS: Position[];

export function createInitialGame(): GameState;
export function getLegalPlacementTargets(state: GameState): PositionId[];
export function getForcedMoveTargets(state: GameState): PositionId[];
export function getLegalMoveTargets(state: GameState, fromId: PositionId): PositionId[];
export function getMovablePieces(state: GameState, player?: Player): PositionId[];
export function getPlayerLabel(player: Player): string;
export function isLegalAction(state: GameState, action: GameAction): boolean;
export function applyAction(state: GameState, action: GameAction): GameState;
export function markDraw(state: GameState, reason: DrawReason): GameState;
