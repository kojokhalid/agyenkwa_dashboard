import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Alert } from "@heroui/alert";
import { Spinner } from "@heroui/spinner";
import { motion, AnimatePresence } from "framer-motion";
import { Bluetooth, Wifi, WifiOff, Activity, Signal } from "lucide-react";
import DefaultLayout from "@/layouts/default";

interface ActiveConnection {
  address: string;
  is_connected: boolean;
  is_active: boolean;
  notify_uuid: string | null;
}

const Devices = () => {
  const [connections, setConnections] = useState<ActiveConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disconnectingDevice, setDisconnectingDevice] = useState<string | null>(
    null
  );

  useEffect(() => {
    fetchConnections();
    // Poll for connections every 3 seconds
    const interval = setInterval(fetchConnections, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchConnections = async () => {
    try {
      const response = await fetch(
        "http://localhost:8000/api/active_connections"
      );
      const data = await response.json();

      if (data.status === "success") {
        setConnections(data.connections);
        setError(null);
      } else {
        setError("Failed to fetch connections");
      }
    } catch (err) {
      setError("Failed to connect to server. Make sure the API is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async (address: string) => {
    setDisconnectingDevice(address);
    try {
      const response = await fetch("http://localhost:8000/api/disconnect_ble", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address }),
      });

      const data = await response.json();

      if (data.status === "success") {
        // Remove from local state immediately
        setConnections((prev) =>
          prev.filter((conn) => conn.address !== address)
        );
      } else {
        alert(`Failed to disconnect: ${data.message}`);
      }
    } catch (err) {
      alert("Disconnect failed");
    } finally {
      setDisconnectingDevice(null);
    }
  };

  if (isLoading) {
    return (
      <DefaultLayout>
        <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10 min-h-[60vh]">
          <Spinner size="lg" label="Loading connected devices..." />
        </section>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <section className="w-full max-w-6xl mx-auto p-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Connected Devices</h1>
            <p className="text-default-500 mt-1">
              Manage your BLE device connections
            </p>
          </div>

          <Chip
            color={connections.length > 0 ? "success" : "default"}
            variant="flat"
            size="lg"
          >
            {connections.length} Connected
          </Chip>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert color="danger" variant="flat" title="Error">
            {error}
          </Alert>
        )}

        {/* Connections List */}
        <AnimatePresence>
          {connections.length > 0 ? (
            <div className="space-y-4">
              {connections.map((connection, index) => (
                <motion.div
                  key={connection.address}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardBody className="p-6">
                      <div className="flex items-center justify-between">
                        {/* Device Info */}
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-16 h-16 rounded-full flex items-center justify-center ${
                              connection.is_active
                                ? "bg-success-100 dark:bg-success-900/30"
                                : "bg-primary-100 dark:bg-primary-900/30"
                            }`}
                          >
                            {connection.is_active ? (
                              <Activity className="w-8 h-8 text-success-600 animate-pulse" />
                            ) : (
                              <Bluetooth className="w-8 h-8 text-primary-600" />
                            )}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="text-xl font-semibold font-mono">
                                {connection.address}
                              </h3>
                              {connection.is_active && (
                                <Chip color="success" size="sm" variant="flat">
                                  Active
                                </Chip>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-sm text-default-500">
                              <div className="flex items-center gap-1">
                                <Signal className="w-4 h-4" />
                                <span>
                                  {connection.is_connected
                                    ? "Connected"
                                    : "Disconnected"}
                                </span>
                              </div>

                              {connection.notify_uuid && (
                                <div className="flex items-center gap-1">
                                  <Wifi className="w-4 h-4" />
                                  <span className="font-mono text-xs">
                                    {connection.notify_uuid.substring(0, 8)}...
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                          <Button
                            color="danger"
                            variant="flat"
                            size="lg"
                            onPress={() => handleDisconnect(connection.address)}
                            isLoading={
                              disconnectingDevice === connection.address
                            }
                            isDisabled={disconnectingDevice !== null}
                            startContent={
                              !disconnectingDevice && (
                                <WifiOff className="w-5 h-5" />
                              )
                            }
                          >
                            {disconnectingDevice === connection.address
                              ? "Disconnecting..."
                              : "Disconnect"}
                          </Button>
                        </div>
                      </div>

                      {/* Additional Info */}
                      {connection.is_active && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-4 pt-4 border-t border-default-200"
                        >
                          <div className="flex items-center gap-2 text-sm text-success-600">
                            <Activity className="w-4 h-4" />
                            <span>
                              This device is currently streaming data via
                              WebSocket
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </CardBody>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 space-y-6"
            >
              <div className="w-32 h-32 mx-auto bg-default-100 dark:bg-default-900/30 rounded-full flex items-center justify-center">
                <Bluetooth className="w-16 h-16 text-default-400" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-semibold text-default-600">
                  No Connected Devices
                </h3>
                <p className="text-default-500">
                  Connect to a BLE device from the search page to see it here
                </p>
              </div>

              <Button
                color="primary"
                size="lg"
                as="a"
                href="/"
                startContent={<Bluetooth className="w-5 h-5" />}
              >
                Go to Search
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </DefaultLayout>
  );
};

export default Devices;
