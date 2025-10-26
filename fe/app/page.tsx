"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
import {
  Detection,
  GameState,
  GameHandlers,
  startNewRound as serviceStartNewRound,
  completeItem as serviceCompleteItem,
  resetGame as serviceResetGame,
  handleTimerTick,
  captureAndAnalyze as serviceCaptureAndAnalyze,
  formatTime,
} from "./services";

export default function Home() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);
  const [showWrongItem, setShowWrongItem] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const allItems = ["cell phone", "clock", "cup", "bottle", "person"];
  const [gameState, setGameState] = useState<GameState>({
    currentItem: "",
    timeLeft: 300,
    score: 0,
    completedItems: [],
    gameActive: false,
    round: 1,
  });
  const [availableItems, setAvailableItems] = useState<string[]>(allItems);
  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user",
  };

  // Game handlers object
  const gameHandlers: GameHandlers = {
    setGameState,
    setAvailableItems,
    setDetections,
    setError,
    setLastAnalysis,
    setIsAnalyzing,
    setShowWrongItem,
  };

  // Game functions using services
  const startNewRound = useCallback(() => {
    serviceStartNewRound(availableItems, gameHandlers);
  }, [availableItems]);

  const completeItem = useCallback(
    (foundItem: string) => {
      serviceCompleteItem(foundItem, gameState, gameHandlers);
    },
    [gameState]
  );

  const resetGame = () => {
    serviceResetGame(allItems, gameHandlers);
  };

  useEffect(() => {
    const audio = new Audio("/2.mp3");
    audio.loop = true;
    audio.volume = 0.3;

    // Set audio attributes for better auto-play compatibility
    audio.preload = "auto";
    audio.muted = false;

    const playAudio = async () => {
      try {
        await audio.play();
        console.log("🎵 Background music started automatically");
      } catch (error) {
        console.log("🔇 Auto-play blocked, waiting for user interaction");

        // Start music on first user interaction
        const startOnInteraction = () => {
          audio.play().catch(console.error);
          document.removeEventListener("click", startOnInteraction);
          document.removeEventListener("touchstart", startOnInteraction);
          document.removeEventListener("keydown", startOnInteraction);
        };

        document.addEventListener("click", startOnInteraction);
        document.addEventListener("touchstart", startOnInteraction);
        document.addEventListener("keydown", startOnInteraction);
      }
    };

    playAudio();

    return () => {
      audio.pause();
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!gameState.gameActive) return;

    const timer = setInterval(() => {
      setGameState((prev) => handleTimerTick(prev, gameHandlers));
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.gameActive]);

  const onUserMedia = () => {
    console.log("✅ Camera started successfully");
    setIsStreaming(true);
    setError(null);
  };

  const onUserMediaError = (error: any) => {
    console.error("❌ Camera error:", error);
    setError(`Camera error: ${error.message || "Failed to access camera"}`);
    setIsStreaming(false);
  };

  // Function to capture and send frame to backend
  const captureAndAnalyze = useCallback(async () => {
    await serviceCaptureAndAnalyze(
      webcamRef,
      isStreaming,
      isAnalyzing,
      gameState,
      gameHandlers
    );
  }, [
    isStreaming,
    isAnalyzing,
    gameState.gameActive,
    gameState.currentItem,
    completeItem,
  ]);

  // Manual capture function for button click
  const handleManualCapture = () => {
    if (!gameState.gameActive) {
      console.warn("⚠️ Game not active");
      return;
    }
    captureAndAnalyze();
  };

  // Auto-start camera when component mounts
  useEffect(() => {
    console.log("🎬 Auto-starting camera...");
    setIsStreaming(true);
  }, []);

  return (
    <div
      key="halloween-game-container"
      className="min-h-screen relative overflow-hidden"
    >
      {/* Background */}
      <div
        key="game-background"
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('/background.gif'), linear-gradient(135deg, #1a0b2e 0%, #7b2d26 50%, #0f0f0f 100%)",
          filter: "brightness(0.4)",
        }}
      />

      {/* Overlay gradient */}
      <div
        key="game-overlay"
        className="absolute inset-0 bg-gradient-to-br from-orange-900/30 via-purple-900/40 to-black/70"
      />

      {/* Floating Halloween elements */}
      <div
        key="floating-elements"
        className="absolute inset-0 overflow-hidden pointer-events-none"
      >
        <div className="absolute top-20 left-10 text-orange-500/20 text-4xl animate-bounce">
          🎃
        </div>
        <div className="absolute top-40 right-20 text-purple-500/20 text-3xl animate-pulse">
          👻
        </div>
        <div
          className="absolute bottom-32 left-1/4 text-orange-400/20 text-5xl animate-bounce"
          style={{ animationDelay: "1s" }}
        >
          🕷️
        </div>
        <div
          className="absolute top-60 right-1/3 text-yellow-500/20 text-2xl animate-pulse"
          style={{ animationDelay: "2s" }}
        >
          ⭐
        </div>
        <div
          className="absolute bottom-20 right-10 text-purple-400/20 text-3xl animate-bounce"
          style={{ animationDelay: "0.5s" }}
        >
          🕸️
        </div>
      </div>

      {/* Main content */}
      <div
        key="main-content"
        className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4"
      >
        <div key="game-container" className="max-w-6xl w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-bold text-orange-400 mb-4 font-serif">
              🎃 Spooky Bring Me Game 🎃
            </h1>
            <p className="text-lg text-orange-200 opacity-90">
              Find the items before time runs out!
            </p>
          </div>

          {/* Game Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-orange-500/20 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-400">
                {gameState.score}
              </div>
              <div className="text-orange-200 text-sm">Score</div>
            </div>
            <div className="bg-purple-500/20 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">
                {gameState.round}
              </div>
              <div className="text-purple-200 text-sm">Round</div>
            </div>
            <div className="bg-green-500/20 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">
                {gameState.completedItems.length}
              </div>
              <div className="text-green-200 text-sm">Found</div>
            </div>
            <div className="bg-blue-500/20 backdrop-blur-sm rounded-lg p-4 text-center">
              <div
                className={`text-2xl font-bold ${
                  gameState.timeLeft < 60 ? "text-red-400" : "text-blue-400"
                }`}
              >
                {formatTime(gameState.timeLeft)}
              </div>
              <div className="text-blue-200 text-sm">Time Left</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Camera Feed Container */}
            <div className="lg:col-span-2">
              <div className="relative bg-black/50 backdrop-blur-sm rounded-2xl border-2 border-orange-500/30 shadow-2xl overflow-hidden">
                <div className="p-6">
                  {/* Current Item Challenge */}
                  {gameState.gameActive && (
                    <div className="mb-4 text-center bg-gradient-to-r from-orange-500/20 to-purple-500/20 rounded-lg p-4">
                      <h3 className="text-xl font-bold text-orange-300 mb-2">
                        🎯 Find This Item:
                      </h3>
                      <div className="text-3xl font-bold text-white capitalize mb-2">
                        {gameState.currentItem.replace("_", " ")}
                      </div>
                      <div className="text-sm text-orange-200 opacity-80">
                        Point your camera at the item and click "Capture &
                        Check"
                      </div>
                    </div>
                  )}

                  {/* Camera Feed */}
                  <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden mb-4">
                    {isStreaming ? (
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        height={720}
                        width={1280}
                        videoConstraints={videoConstraints}
                        onUserMedia={onUserMedia}
                        onUserMediaError={onUserMediaError}
                        className="w-full h-full object-cover"
                        mirrored={true}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <div className="text-center">
                          <div className="text-6xl mb-4 animate-pulse">📷</div>
                          <p className="text-lg">Starting camera...</p>
                          <p className="text-sm opacity-70 mt-2">
                            Please allow camera permissions when prompted
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Analysis Indicator */}
                    {isAnalyzing && (
                      <div className="absolute top-4 right-4 bg-yellow-500/20 backdrop-blur-sm text-yellow-300 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                        Analyzing...
                      </div>
                    )}

                    {/* Item Found Overlay */}
                    {detections.length > 0 && (
                      <div className="absolute inset-0 bg-green-500/20 backdrop-blur-sm flex items-center justify-center">
                        <div className="text-center text-green-300">
                          <div className="text-6xl mb-4">✅</div>
                          <div className="text-2xl font-bold">Item Found!</div>
                          <div className="text-lg">Starting next round...</div>
                        </div>
                      </div>
                    )}

                    {/* Wrong Item Overlay */}
                    {showWrongItem && (
                      <div className="absolute inset-0 bg-red-500/20 backdrop-blur-sm flex items-center justify-center">
                        <div className="text-center text-red-300">
                          <div className="text-6xl mb-4">❌</div>
                          <div className="text-2xl font-bold">Wrong Item!</div>
                          <div className="text-lg capitalize">
                            Looking for "{gameState.currentItem}"
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Game Controls */}
                  <div className="flex gap-4 justify-center flex-wrap">
                    {!gameState.gameActive && availableItems.length > 0 && (
                      <button
                        onClick={startNewRound}
                        disabled={!isStreaming}
                        className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <span>🎮</span>
                        {gameState.completedItems.length === 0
                          ? "Start Game"
                          : "Next Round"}
                      </button>
                    )}

                    {/* Capture Button - only show when game is active */}
                    {gameState.gameActive && (
                      <button
                        onClick={handleManualCapture}
                        disabled={!isStreaming || isAnalyzing}
                        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        <span>📸</span>
                        {isAnalyzing ? "Analyzing..." : "Capture & Check"}
                      </button>
                    )}

                    {availableItems.length === 0 && (
                      <div className="text-center">
                        <div className="text-4xl mb-4">🏆</div>
                        <div className="text-2xl font-bold text-green-400 mb-2">
                          Game Completed!
                        </div>
                        <div className="text-lg text-green-300 mb-4">
                          Final Score: {gameState.score}
                        </div>
                        <button
                          onClick={resetGame}
                          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                        >
                          🎮 Play Again
                        </button>
                      </div>
                    )}

                    <button
                      onClick={resetGame}
                      className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <span>🔄</span>
                      Reset Game
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Game Progress Panel */}
            <div className="lg:col-span-1">
              <div className="bg-black/50 backdrop-blur-sm rounded-2xl border-2 border-purple-500/30 shadow-2xl overflow-hidden h-full">
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                    🎯 Progress
                  </h2>

                  {/* Completed Items */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-green-400 mb-2">
                      ✅ Completed ({gameState.completedItems.length}/
                      {allItems.length})
                    </h3>
                    <div className="space-y-2">
                      {gameState.completedItems.map((item, index) => (
                        <div
                          key={index}
                          className="bg-green-900/30 border border-green-500/20 rounded-lg p-2 text-green-200 capitalize"
                        >
                          {item.replace("_", " ")}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Remaining Items */}
                  <div>
                    <h3 className="text-lg font-semibold text-orange-400 mb-2">
                      🎯 Remaining ({availableItems.length})
                    </h3>
                    <div className="space-y-2">
                      {availableItems.map((item, index) => (
                        <div
                          key={index}
                          className={`border rounded-lg p-2 capitalize ${
                            item === gameState.currentItem &&
                            gameState.gameActive
                              ? "bg-orange-900/50 border-orange-500/50 text-orange-200 animate-pulse"
                              : "bg-gray-900/30 border-gray-500/20 text-gray-300"
                          }`}
                        >
                          {item === gameState.currentItem &&
                            gameState.gameActive &&
                            "👉 "}
                          {item.replace("_", " ")}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-6 bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-lg">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
              <p className="text-sm mt-2 opacity-80">
                💡 Make sure your backend is running at localhost:8000
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center mt-8 text-orange-300/70">
            <p className="text-sm">🕷️ AI Detection • Powered by YOLOv11 🕷️</p>
          </div>
        </div>
      </div>
    </div>
  );
}
