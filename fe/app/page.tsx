"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Webcam from "react-webcam";

interface Detection {
  class: string;
  confidence: number;
}

interface DetectionResponse {
  success: boolean;
  detections: Detection[];
  total_objects: number;
  confidence_threshold: number;
}

export default function Home() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);
  const webcamRef = useRef<Webcam>(null);

  const videoConstraints = {
    width: 1280,
    height: 720,
    facingMode: "user",
  };

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
    if (!webcamRef.current || !isStreaming || isAnalyzing) return;

    try {
      setIsAnalyzing(true);

      // Capture frame from webcam
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        console.warn("⚠️ No image captured");
        return;
      }

      console.log("📸 Frame captured, sending to backend...");

      // Convert base64 to blob
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      console.log("🔄 Blob created:", blob.type, blob.size, "bytes");

      // Create FormData to send to backend
      const formData = new FormData();
      formData.append("file", blob, "frame.jpg");
      formData.append("confidence_threshold", "0.5");

      console.log("📤 Sending request to backend...");

      // Send to backend
      const backendResponse = await fetch("http://localhost:8000/api/detect", {
        method: "POST",
        body: formData,
      });

      if (!backendResponse.ok) {
        // Try to get error details from backend
        const errorText = await backendResponse.text();
        console.error("❌ Backend error details:", errorText);
        throw new Error(
          `Backend error: ${backendResponse.status} - ${errorText}`
        );
      }

      const result = await backendResponse.json();
      console.log("🎯 Backend response data:", result);

      // Update interface based on new backend response format
      if (result.success && result.detections) {
        setDetections(result.detections);
        setLastAnalysis(new Date().toLocaleTimeString());
        setError(null);
        console.log("✅ Detections updated:", result.detections);
      } else {
        console.warn("⚠️ No detections in response");
        setDetections([]);
      }
    } catch (err) {
      console.error("❌ Full error details:", err);
      setError(
        `Analysis failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [isStreaming, isAnalyzing]);

  // Auto-analyze frames every 2 seconds
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      captureAndAnalyze();
    }, 2000);

    return () => clearInterval(interval);
  }, [isStreaming, captureAndAnalyze]);

  // Auto-start camera when component mounts
  useEffect(() => {
    console.log("🎬 Auto-starting camera...");
    setIsStreaming(true);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('/background.gif'), linear-gradient(135deg, #1a0b2e 0%, #7b2d26 50%, #0f0f0f 100%)",
          filter: "brightness(0.4)",
        }}
      />

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-900/30 via-purple-900/40 to-black/70" />

      {/* Floating Halloween elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-6xl w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-6xl font-bold text-orange-400 mb-4 font-serif">
              🎃 Halloween AI Detection 🎃
            </h1>
            <p className="text-lg text-orange-200 opacity-90">
              Spooky live object detection with YOLOv11
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Camera Feed Container */}
            <div className="lg:col-span-2">
              <div className="relative bg-black/50 backdrop-blur-sm rounded-2xl border-2 border-orange-500/30 shadow-2xl overflow-hidden">
                <div className="p-6">
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
                  </div>

                  {/* Camera Status */}
                  {isStreaming && !error && (
                    <div className="text-center text-green-400 text-sm flex items-center justify-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Camera Active
                      </div>
                      {lastAnalysis && (
                        <div className="flex items-center gap-2 text-blue-400">
                          <span>🔍</span>
                          Last scan: {lastAnalysis}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Detection Results Panel */}
            <div className="lg:col-span-1">
              <div className="bg-black/50 backdrop-blur-sm rounded-2xl border-2 border-purple-500/30 shadow-2xl overflow-hidden h-full">
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                    🎯 Detections
                  </h2>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {detections.length > 0 ? (
                      detections.map((detection, index) => (
                        <div
                          key={index}
                          className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-3"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-purple-200 capitalize">
                              {detection.class
                                ? detection.class.replace("_", " ")
                                : "Unknown"}
                            </span>
                            <span className="text-green-400 text-sm font-mono">
                              {detection.confidence
                                ? Math.round(detection.confidence * 100)
                                : 0}
                              %
                            </span>
                          </div>
                          <div className="text-xs text-purple-300 opacity-70">
                            Class: {detection.class || "Unknown"}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-400 py-8">
                        <div className="text-4xl mb-2">👁️</div>
                        <p>No objects detected yet</p>
                        <p className="text-sm opacity-70 mt-1">
                          Move in front of the camera
                        </p>
                      </div>
                    )}
                  </div>
                  {/* Manual Analyze Button */}
                  <button
                    onClick={captureAndAnalyze}
                    disabled={!isStreaming || isAnalyzing}
                    className="w-full mt-4 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <span>🔍</span>
                        Analyze Now
                      </>
                    )}
                  </button>
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
            <p className="text-sm">
              🕷️ Halloween AI Detection • Powered by YOLOv11 🕷️
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
