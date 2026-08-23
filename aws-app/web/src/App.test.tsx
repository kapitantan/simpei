// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import App from "./App";

function renderAt(route: string) {
  window.history.replaceState(null, "", `/#${route}`);
  return render(<App />);
}

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("HashRouter routes", () => {
  test.each([
    ["/", "ローカル対戦を始める"],
    ["/local", "赤の手番"],
    ["/rooms/room-123", "対戦ルーム"],
    ["/webrtc-lab/match-123", "WebRTC学習"],
  ])("renders %s directly", (route, expectedText) => {
    renderAt(route);
    expect(screen.getByText(expectedText)).toBeTruthy();
  });

  test("restores the screen with browser back and forward", async () => {
    renderAt("/");
    fireEvent.click(screen.getByRole("link", { name: "ローカル対戦を始める" }));

    await screen.findByText("赤の手番");

    window.history.back();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "ローカル対戦を始める" })).toBeTruthy();
    });

    window.history.forward();
    await screen.findByText("赤の手番");
  });
});
