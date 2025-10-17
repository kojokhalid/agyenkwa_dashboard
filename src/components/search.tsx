import { useState, useEffect } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Spinner } from "@heroui/spinner";
import { Chip } from "@heroui/chip";
import { Alert } from "@heroui/alert";
import { Bluetooth, Waves, Signal, Wifi } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useNavigate } from "react-router-dom";

interface BLEDevice {
  name: string | null;
  address: string;
}

interface ScanResponse {
  status: string;
  count: number;
  devices: BLEDevice[];
}

const Search = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [devices, setDevices] = useState<BLEDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connectingDevice, setConnectingDevice] = useState<string | null>(null);
  const navigate = useNavigate();
  const scanForDevices = async () => {
    setIsSearching(true);
    setError(null);
    setDevices([]);

    try {
      const response = await fetch("http://localhost:8000/api/scan_ble");
      const data: ScanResponse = await response.json();

      if (data.status === "success") {
        // Simulate a delay to show animation
        setTimeout(() => {
          // Filter out devices with null names
          const filteredDevices = data.devices.filter(
            (device) => device.name !== null
          );
          setDevices(filteredDevices);
          setIsSearching(false);
        }, 1000);
      } else {
        setError("Scan failed");
        setIsSearching(false);
      }
    } catch (err) {
      setError("Failed to connect to server. Make sure the API is running.");
      setIsSearching(false);
    }
  };

  // Auto-start scanning when component mounts
  useEffect(() => {
    scanForDevices();
  }, []);

  const handleConnect = async (device: BLEDevice) => {
    setConnectingDevice(device.address);
    try {
      const response = await fetch("http://localhost:8000/api/connect_ble", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address: device.address }),
      });

      const data = await response.json();

      if (data.status === "success") {
        navigate("/"); // Redirect to home page on successful connection
      } else {
        alert(`Failed to connect: ${data.message}`);
      }
    } catch (err) {
      alert("Connection failed");
    } finally {
      setConnectingDevice(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header Section */}

      {/* Scan Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          color="primary"
          onPress={scanForDevices}
          isDisabled={isSearching}
          startContent={!isSearching && <Bluetooth className="w-5 h-5" />}
          className="px-8"
        >
          {isSearching ? "Scanning..." : "Start Scan"}
        </Button>
      </div>

      {/* Searching Animation */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center justify-center py-12 space-y-6"
          >
            {/* Lottie Radar Animation */}
            <div className="w-64 h-64 flex items-center justify-center">
              <DotLottieReact
                src="/animations/Radar.lottie"
                loop
                autoplay
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            <div className="text-center space-y-2">
              <p className="text-lg font-medium">Searching for devices...</p>
              <p className="text-sm text-default-500">
                Please wait while we scan for SmartCap device
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Alert color="danger" variant="flat" title="Error">
            {error}
          </Alert>
        </motion.div>
      )}

      {/* Device List */}
      <AnimatePresence>
        {!isSearching && devices.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">
                Found {devices.length} Device{devices.length !== 1 ? "s" : ""}
              </h2>
              <Chip color="success" variant="flat">
                {devices.length} available
              </Chip>
            </div>

            <div className="grid gap-4">
              {devices.map((device, index) => (
                <motion.div
                  key={device.address}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardBody className="flex flex-row items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          {device.name ? (
                            <Bluetooth className="w-6 h-6 text-primary" />
                          ) : (
                            <Signal className="w-6 h-6 text-default-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {device.name || "Unknown Device"}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          color="primary"
                          variant="flat"
                          onPress={() => handleConnect(device)}
                          isLoading={connectingDevice === device.address}
                          isDisabled={connectingDevice !== null}
                        >
                          {connectingDevice === device.address ? "Connecting..." : "Connect"}
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Devices Found */}
      {!isSearching && devices.length === 0 && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 space-y-4"
        >
          <div className="w-24 h-24 mx-auto bg-default-100 rounded-full flex items-center justify-center">
            <Bluetooth className="w-12 h-12 text-default-400" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-default-600">
              No devices scanned yet
            </h3>
            <p className="text-default-500 mt-2">
              Click "Start Scan" to discover BLE devices nearby
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Search;
