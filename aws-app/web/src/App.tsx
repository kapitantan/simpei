import GamePage from "./pages/GamePage";
import { HashRouter, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import RoomPage from "./pages/RoomPage";

const App = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/local" element={<GamePage />} />
        <Route path="/rooms/:roomId" element={<RoomPage />} />
      </Routes>
    </HashRouter>
  );
};

export default App; 