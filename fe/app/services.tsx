// Game service functions and API calls

export interface Detection {
  class: string;
  confidence: number;
}

export interface GameState {
  currentItem: string;
  timeLeft: number;
  score: number;
  completedItems: string[];
  gameActive: boolean;
  round: number;
}

export interface GameHandlers {
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  setAvailableItems: React.Dispatch<React.SetStateAction<string[]>>;
  setDetections: React.Dispatch<React.SetStateAction<Detection[]>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setLastAnalysis: React.Dispatch<React.SetStateAction<string | null>>;
  setIsAnalyzing: React.Dispatch<React.SetStateAction<boolean>>;
  setShowWrongItem: React.Dispatch<React.SetStateAction<boolean>>;
}

// API call to detect objects
export const detectObjects = async (
  imageSrc: string,
  targetClass: string,
  confidenceThreshold: string = "0.5"
): Promise<any> => {
  console.log("📸 Frame captured, sending to backend...");

  // Convert base64 to blob
  const response = await fetch(imageSrc);
  const blob = await response.blob();
  console.log("🔄 Blob created:", blob.type, blob.size, "bytes");

  // Create FormData to send to backend
  const formData = new FormData();
  formData.append("file", blob, "frame.jpg");
  formData.append("confidence_threshold", confidenceThreshold);
  formData.append("target_class", targetClass);

  console.log(`🎯 Looking for: ${targetClass}`);

  // Send to backend
  const backendResponse = await fetch("http://localhost:8000/api/detect", {
    method: "POST",
    body: formData,
  });

  if (!backendResponse.ok) {
    const errorText = await backendResponse.text();
    console.error("❌ Backend error details:", errorText);
    throw new Error(`Backend error: ${backendResponse.status} - ${errorText}`);
  }

  const result = await backendResponse.json();
  console.log("🎯 Backend response data:", result);
  return result;
};

// Start a new round
export const startNewRound = (
  availableItems: string[],
  handlers: GameHandlers
) => {
  if (availableItems.length === 0) {
    // Game completed - play jumpscare immediately!
    console.log("🏆 Game completed! Playing jumpscare...");
    handlers.setGameState((prev) => ({
      ...prev,
      gameActive: false,
    }));
    playJumpscare();
    return;
  }

  const randomItem =
    availableItems[Math.floor(Math.random() * availableItems.length)];
  handlers.setGameState((prev) => ({
    ...prev,
    currentItem: randomItem,
    timeLeft: 300,
    gameActive: true,
  }));
};

// Complete an item
export const completeItem = (
  foundItem: string,
  gameState: GameState,
  handlers: GameHandlers
) => {
  console.log(`✅ Item completed: ${foundItem}`);

  // Update score and completed items immediately
  handlers.setGameState((prev) => ({
    ...prev,
    score: prev.score + Math.max(100, Math.floor(prev.timeLeft / 3)),
    completedItems: [...prev.completedItems, foundItem],
    round: prev.round + 1,
    gameActive: false,
  }));

  // Remove item from available items
  handlers.setAvailableItems((prev) => {
    const newItems = prev.filter((item) => item !== foundItem);
    console.log(`📝 Remaining items: ${newItems.length}`, newItems);

    // Clear detections and handle next round or game completion
    setTimeout(() => {
      handlers.setDetections([]);

      if (newItems.length > 0) {
        console.log("🎮 Starting next round...");
        const randomItem =
          newItems[Math.floor(Math.random() * newItems.length)];
        handlers.setGameState((prevState) => ({
          ...prevState,
          currentItem: randomItem,
          timeLeft: 300,
          gameActive: true,
        }));
      } else {
        // Game completed - play jumpscare!
        console.log("🏆 Game completed! Playing jumpscare...");
        playJumpscare();
      }
    }, 3000);

    return newItems;
  });
};

// Reset the game
export const resetGame = (allItems: string[], handlers: GameHandlers) => {
  handlers.setGameState({
    currentItem: "",
    timeLeft: 300,
    score: 0,
    completedItems: [],
    gameActive: false,
    round: 1,
  });
  handlers.setAvailableItems(allItems);
  handlers.setDetections([]);
  handlers.setError(null);
  handlers.setShowWrongItem(false);
};

// Handle timer countdown
export const handleTimerTick = (
  gameState: GameState,
  handlers: GameHandlers
) => {
  if (gameState.timeLeft <= 1) {
    // Time's up! Move to next round or end game
    handlers.setAvailableItems((currentItems) => {
      const newItems = currentItems.filter(
        (item) => item !== gameState.currentItem
      );
      console.log(
        `⏰ Time's up! Removing ${gameState.currentItem}. ${newItems.length} items left.`
      );

      setTimeout(() => {
        if (newItems.length > 0) {
          // Start next round with remaining items
          const randomItem =
            newItems[Math.floor(Math.random() * newItems.length)];
          handlers.setGameState((prevState) => ({
            ...prevState,
            currentItem: randomItem,
            timeLeft: 300,
            gameActive: true,
          }));
        } else {
          // No more items, end game with jumpscare
          handlers.setGameState((prevState) => ({
            ...prevState,
            gameActive: false,
          }));

          // Play jumpscare video
          setTimeout(async () => {
            await playJumpscare();
            console.log("👻 Jumpscare complete! Game ended by timeout.");
          }, 500);
        }
      }, 1000);

      return newItems;
    });

    return { ...gameState, timeLeft: 0, gameActive: false };
  }
  return { ...gameState, timeLeft: gameState.timeLeft - 1 };
};

// Capture and analyze frame
export const captureAndAnalyze = async (
  webcamRef: React.RefObject<any>,
  isStreaming: boolean,
  isAnalyzing: boolean,
  gameState: GameState,
  handlers: GameHandlers
) => {
  if (
    !webcamRef.current ||
    !isStreaming ||
    isAnalyzing ||
    !gameState.gameActive
  ) {
    return;
  }

  try {
    handlers.setIsAnalyzing(true);

    // Capture frame from webcam
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      console.warn("⚠️ No image captured");
      return;
    }

    const result = await detectObjects(imageSrc, gameState.currentItem);

    // Update interface based on new backend response format
    if (result.success && result.detections && result.detections.length > 0) {
      handlers.setDetections(result.detections);
      handlers.setLastAnalysis(new Date().toLocaleTimeString());
      handlers.setError(null);
      console.log("✅ Detections updated:", result.detections);

      // Item found! Complete the round immediately
      setTimeout(() => {
        completeItem(gameState.currentItem, gameState, handlers);
      }, 100); // Small delay to ensure UI updates
    } else {
      console.warn("⚠️ No detections in response");
      handlers.setDetections([]);

      // Show "wrong item" overlay
      handlers.setShowWrongItem(true);
      handlers.setLastAnalysis(new Date().toLocaleTimeString());
      handlers.setError(null); // Clear any previous errors

      // Hide wrong item overlay after 2 seconds
      setTimeout(() => {
        handlers.setShowWrongItem(false);
      }, 2000);
    }
  } catch (err) {
    console.error("❌ Full error details:", err);
    handlers.setError(
      `Analysis failed: ${err instanceof Error ? err.message : "Unknown error"}`
    );
  } finally {
    handlers.setIsAnalyzing(false);
  }
};

// Format time display
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// Play jumpscare video
export const playJumpscare = (): Promise<void> => {
  return new Promise((resolve) => {
    console.log("🎬 Playing jumpscare video...");

    // Create video element
    const video = document.createElement("video");
    video.src = "/1.mp4";
    video.autoplay = true;
    video.muted = false; // Allow sound for jumpscare
    video.loop = false;
    video.controls = false;
    video.style.position = "fixed";
    video.style.top = "0";
    video.style.left = "0";
    video.style.width = "100vw";
    video.style.height = "100vh";
    video.style.objectFit = "cover";
    video.style.zIndex = "9999";
    video.style.backgroundColor = "black";

    // Add to body
    document.body.appendChild(video);

    // Remove video when it ends
    video.onended = () => {
      console.log("🎬 Jumpscare video ended");
      document.body.removeChild(video);
      resolve();
    };

    // Also remove if user clicks (escape option)
    video.onclick = () => {
      console.log("🎬 Jumpscare video skipped");
      video.pause();
      document.body.removeChild(video);
      resolve();
    };

    // Auto-remove after 10 seconds as fallback
    setTimeout(() => {
      if (document.body.contains(video)) {
        console.log("🎬 Jumpscare video auto-removed");
        video.pause();
        document.body.removeChild(video);
        resolve();
      }
    }, 10000);
  });
};
