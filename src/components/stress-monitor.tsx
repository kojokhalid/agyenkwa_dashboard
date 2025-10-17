import { useState, useEffect, useRef } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Alert } from "@heroui/alert";
import { motion, AnimatePresence } from "framer-motion";
import { Activity } from "lucide-react";
import "zingchart/es6";
import ZingChart from "zingchart-react";
import "zingchart/modules-es6/zingchart-depth.min.js";
interface StreamData {
  timestamp: string;
  sender: string;
  hex: string;
  ascii: string;
  raw_length: number;
  stress_level: number; // Calculated by backend (1-4)
}

interface ActiveConnection {
  address: string;
  is_connected: boolean;
  is_active: boolean;
  notify_uuid: string | null;
}

interface StressMonitorProps {
  connection?: ActiveConnection | null;
}

const StressMonitor = ({
  connection: initialConnection,
}: StressMonitorProps) => {
  const [isStreaming, setIsStreaming] = useState(true);
  const [stressLevel, setStressLevel] = useState(4);
  const [dataPoints, setDataPoints] = useState<StreamData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ActiveConnection | null>(
    initialConnection || null
  );
  const [showAlert, setShowAlert] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const previousLevelRef = useRef<number>(4);
  const audioContextRef = useRef<AudioContext | null>(null);
  const beepIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio context on component mount
  useEffect(() => {
    // Create audio context once
    audioContextRef.current = new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (beepIntervalRef.current) {
        clearInterval(beepIntervalRef.current);
      }
    };
  }, []);

  // Play beep sound - Police Siren
  const playBeep = () => {
    if (!audioContextRef.current) return;

    try {
      const audioContext = audioContextRef.current;

      // Create two oscillators for the alternating siren effect
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // High pitch (E note)
      oscillator1.frequency.value = 659;
      oscillator1.type = "sine";

      // Low pitch (D note)
      oscillator2.frequency.value = 587;
      oscillator2.type = "sine";

      // Volume envelope
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);

      // High tone first
      gainNode.gain.linearRampToValueAtTime(
        0.4,
        audioContext.currentTime + 0.05
      );
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime + 0.25);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);

      // Low tone
      gainNode.gain.linearRampToValueAtTime(
        0.4,
        audioContext.currentTime + 0.35
      );
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime + 0.55);
      gainNode.gain.linearRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.6
      );

      // Play high tone first
      oscillator1.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 0.3);

      // Then low tone
      oscillator2.start(audioContext.currentTime + 0.3);
      oscillator2.stop(audioContext.currentTime + 0.6);

      console.log("� Police Siren!");
    } catch (err) {
      console.error("Failed to play beep:", err);
    }
  };

  // Start continuous beeping
  const startContinuousBeep = () => {
    // Play first beep immediately
    playBeep();

    // Set up interval for continuous beeping (every 1 second)
    beepIntervalRef.current = setInterval(() => {
      playBeep();
    }, 1000);

    // Show alert dialog
    setShowAlert(true);
    console.log("🚨 ALERT! Continuous beeping started - stress level 4!");
  };

  // Stop continuous beeping
  const stopContinuousBeep = () => {
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
    setShowAlert(false);
    console.log("✅ Beeping stopped - alert acknowledged");
  };

  // Monitor stress level changes and start/stop beeping
  useEffect(() => {
    console.log(
      `Stress level changed: ${previousLevelRef.current} → ${stressLevel}`
    );

    if (stressLevel === 4 && previousLevelRef.current !== 4) {
      console.log("Triggering continuous beep - stress level reached 4!");
      startContinuousBeep();
    } else if (stressLevel !== 4 && beepIntervalRef.current) {
      // Stop beeping if level drops below 4
      stopContinuousBeep();
    }

    previousLevelRef.current = stressLevel;
  }, [stressLevel]);

  // Fetch connection if not provided
  useEffect(() => {
    if (!initialConnection) {
      fetchActiveConnection();
    }
  }, [initialConnection]);

  const fetchActiveConnection = async () => {
    try {
      const response = await fetch(
        "http://localhost:8000/api/active_connections"
      );
      const data = await response.json();

      if (data.status === "success" && data.connections.length > 0) {
        const activeConn = data.connections.find(
          (conn: ActiveConnection) => conn.is_active && conn.is_connected
        );
        if (activeConn) {
          setConnection(activeConn);
        }
      }
    } catch (err) {
      console.error("Failed to fetch active connection:", err);
      setError("No active device connection found");
    }
  };

  // ZingChart configuration
  const chartConfig = {
    type: "gauge",
    globals: {
      fontSize: 25,
    },
    plotarea: {
      marginTop: 80,
    },
    plot: {
      size: "100%",
      valueBox: {
        placement: "center",
        text: "%v",
        fontSize: 35,
        // rules: [
        //   {
        //     rule: "%v == 1",
        //     text: "%v<br>NEUTRAL",
        //   },
        //   {
        //     rule: "%v == 2",
        //     text: "%v<br>VERY GOOD",
        //   },
        //   {
        //     rule: "%v == 3",
        //     text: "%v<br>BAD",
        //   },
        //   {
        //     rule: "%v == 4",
        //     text: "%v<br>VERY BAD",
        //   },
        // ],
      },
    },
    tooltip: {
      borderRadius: 5,
    },
    scaleR: {
      aperture: 180,
      minValue: 1,
      maxValue: 4,
      step: 1,
      center: {
        visible: false,
      },
      tick: {
        visible: false,
      },
      item: {
        offsetR: 0,
      },
      labels: ["1", "2", "3", "4"],
      ring: {
        size: 50,
        rules: [
          {
            rule: "%v >= 1 && %v < 2",
            backgroundColor: "#94A3B8", // Neutral gray
          },
          {
            rule: "%v >= 2 && %v < 3",
            backgroundColor: "#22C55E", // Very Good - green
          },
          {
            rule: "%v >= 3 && %v < 4",
            backgroundColor: "#F59E0B", // Bad - orange
          },
          {
            rule: "%v >= 4",
            backgroundColor: "#EF4444", // Very Bad - red
          },
        ],
      },
    },
    series: [
      {
        values: [stressLevel],
        backgroundColor: "black",
        indicator: [10, 10, 10, 10, 0.75],
        animation: {
          effect: 2,
          method: 1,
          sequence: 4,
          speed: 900,
        },
      },
    ],
  };

  // Note: Stress calculation is now done on the backend
  // The backend calculates stress_level and sends it with each message

  const startStreaming = () => {
    if (!connection) {
      console.log("No connection available");
      return;
    }

    setIsStreaming(true);
    setError(null);

    var ws = new WebSocket("ws://localhost:8000/ws/stream");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WebSocket Connected Successfully!");
      console.log("🔌 Connection URL: ws://localhost:8000/ws/stream");
      console.log("📡 Waiting for data...");
      console.log("─".repeat(80));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        console.log("─".repeat(80));
        console.log("📨 NEW MESSAGE RECEIVED:");
        console.log("🕐 Raw Event Data:", event.data);
        console.log("📦 Parsed Data:", data);
        if (
          data.message ==
          "Streaming error: Characteristic notifications already started"
        ){
            var ws = new WebSocket("ws://localhost:8000/ws/stop");
            ws.onopen = () => {
                ws.send("stop");
                console.log("📤 Sent 'stop' command to server");
                ws.close();
            };
     var ws = new WebSocket("ws://localhost:8000/ws/stream");
     wsRef.current = ws;

 ws.onmessage = (event) => {
   try {
     const data = JSON.parse(event.data);

     console.log("─".repeat(80));
     console.log("📨 NEW MESSAGE RECEIVED:");
     console.log("🕐 Raw Event Data:", event.data);
     console.log("📦 Parsed Data:", data);
     if (
       data.message ==
       "Streaming error: Characteristic notifications already started"
     ) {
        setIsStreaming(false);
       var ws = new WebSocket("ws://localhost:8000/ws/stop");
       ws.onopen = () => {
         ws.send("stop");
         console.log("📤 Sent 'stop' command to server");
         ws.close();
       };
       var ws = new WebSocket("ws://localhost:8000/ws/stream");
       wsRef.current = ws;
       setIsStreaming(true)
     }
     if (data.timestamp && data.stress_level !== undefined) {
       // It's streaming data with stress level from backend
       console.log("✨ Streaming Data Details:");
       console.log("  ├─ Timestamp:", data.timestamp);
       console.log("  ├─ Sender:", data.sender);
       console.log("  ├─ Hex:", data.hex);
       console.log("  ├─ ASCII:", data.ascii);
       console.log("  ├─ Raw Length:", data.raw_length, "bytes");
       console.log(
         "  └─ 💓 Stress Level (from backend):",
         data.stress_level,
         "/4"
       );

       setDataPoints((prev) => {
         const updated = [...prev.slice(-20), data];
         console.log("📊 Total Data Points Collected:", updated.length);
         return updated;
       });

       // Use stress level calculated by backend
       setStressLevel(data.stress_level);
       console.log("✅ Updated UI with stress level:", data.stress_level);
     } else if (data.status) {
       // It's a status message
       console.log("ℹ️  Status Message:");
       console.log("  ├─ Status:", data.status);
       console.log("  ├─ Address:", data.address || "N/A");
       console.log("  └─ Notify UUID:", data.notify_uuid || "N/A");
     } else {
       console.log("⚠️  Unknown Message Type:", data);
     }

     console.log("─".repeat(80));
   } catch (err) {
     console.error("❌ Error parsing message:", err);
     console.error("📄 Raw data:", event.data);
   }
 };


        }
          if (data.timestamp && data.stress_level !== undefined) {
            // It's streaming data with stress level from backend
            console.log("✨ Streaming Data Details:");
            console.log("  ├─ Timestamp:", data.timestamp);
            console.log("  ├─ Sender:", data.sender);
            console.log("  ├─ Hex:", data.hex);
            console.log("  ├─ ASCII:", data.ascii);
            console.log("  ├─ Raw Length:", data.raw_length, "bytes");
            console.log(
              "  └─ 💓 Stress Level (from backend):",
              data.stress_level,
              "/4"
            );

            setDataPoints((prev) => {
              const updated = [...prev.slice(-20), data];
              console.log("📊 Total Data Points Collected:", updated.length);
              return updated;
            });

            // Use stress level calculated by backend
            setStressLevel(data.stress_level);
            console.log("✅ Updated UI with stress level:", data.stress_level);
          } else if (data.status) {
            // It's a status message
            console.log("ℹ️  Status Message:");
            console.log("  ├─ Status:", data.status);
            console.log("  ├─ Address:", data.address || "N/A");
            console.log("  └─ Notify UUID:", data.notify_uuid || "N/A");
          } else {
            console.log("⚠️  Unknown Message Type:", data);
          }

        console.log("─".repeat(80));
      } catch (err) {
        console.error("❌ Error parsing message:", err);
        console.error("📄 Raw data:", event.data);
      }
    };

    ws.onerror = (error) => {
      console.error("─".repeat(80));
      console.error("❌ WebSocket Error Occurred:");
      console.error("🔴 Error Details:", error);
      console.error("─".repeat(80));
      setError("WebSocket connection failed");
      setIsStreaming(false);
    };

    ws.onclose = (event) => {
      console.log("─".repeat(80));
      console.log("🔌 WebSocket Disconnected");
      console.log("  ├─ Code:", event.code);
      console.log("  ├─ Reason:", event.reason || "No reason provided");
      console.log("  ├─ Clean Close:", event.wasClean);
      console.log("  └─ Timestamp:", new Date().toISOString());
      console.log("─".repeat(80));
      setIsStreaming(false);
    };
  };

  const stopStreaming = () => {
    console.log("⏹️  Stopping WebSocket stream...");
    if (wsRef.current) {
      wsRef.current.send("stop");
      console.log("📤 Sent 'stop' command to server");
      wsRef.current.close();
      wsRef.current = null;
      console.log("✅ WebSocket closed successfully");
    }
    setIsStreaming(false);
  };

  // Auto-start streaming when component mounts and connection is available
  useEffect(() => {
    if (connection) {
      startStreaming();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connection,isStreaming]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stress Level Monitor</h1>
          <p className="text-default-500 mt-1">Real-time stress Level</p>
        </div>
      </div>

      {/* Critical Alert Modal - Continuous Beeping */}
      <AnimatePresence>
        {showAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md"
            >
              <Card className="border-4 border-danger">
                <CardHeader className="bg-danger text-white p-6">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    >
                      <Activity className="w-8 h-8" />
                    </motion.div>
                    <div>
                      <h2 className="text-2xl font-bold">CRITICAL ALERT!</h2>
                      <p className="text-danger-100 text-sm">
                        Stress Level 4 Detected
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardBody className="p-6 space-y-4">
                  <div className="text-center space-y-3">
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="text-6xl font-bold text-danger"
                    >
                      4
                    </motion.div>
                    <p className="text-lg font-semibold text-danger">
                      VERY BAD - Critical Stress Level
                    </p>
                    <p className="text-default-600">
                      Your stress levels are critically high. Please take
                      immediate action to reduce stress.
                    </p>
                  </div>

                  <div className="bg-danger-50 dark:bg-danger-900/20 p-4 rounded-lg">
                    <p className="text-sm font-semibold mb-2">
                      ⚠️ Recommended Actions:
                    </p>
                    <ul className="text-sm space-y-1 text-default-700">
                      <li>• Take deep breaths</li>
                      <li>• Step away from stressful situation</li>
                      <li>• Seek immediate support if needed</li>
                    </ul>
                  </div>

                  <Button
                    size="lg"
                    color="danger"
                    className="w-full font-bold"
                    onPress={stopContinuousBeep}
                  >
                    I ACKNOWLEDGE - STOP ALERT
                  </Button>
                </CardBody>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Stress Display */}
      <div className="flex flex-col items-center justify-center space-y-6">
        {/* ZingChart Gauge */}
        <div className="w-full max-w-2xl">
          <ZingChart data={chartConfig} height="500" width="100%" />
        </div>
      </div>
    </div>
  );
};

export default StressMonitor;
