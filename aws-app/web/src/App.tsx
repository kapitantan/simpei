import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import GamePage from "./pages/GamePage";
import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomPage";
import WebRtcLabPage from "./pages/WebRtcLabPage";

const App = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/local" element={<GamePage />} />
        <Route path="/rooms/:roomId" element={<RoomPage />} />
        <Route path="/webrtc-lab/:matchId" element={<WebRtcLabPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
