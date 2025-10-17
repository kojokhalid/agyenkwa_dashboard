import { useState, useEffect } from "react";
import { Link } from "@heroui/link";
import { Snippet } from "@heroui/snippet";
import { Code } from "@heroui/code";
import { button as buttonStyles } from "@heroui/theme";

import { siteConfig } from "@/config/site";
import { title, subtitle } from "@/components/primitives";
import { GithubIcon } from "@/components/icons";
import DefaultLayout from "@/layouts/default";
import Search from "@/components/search";
import StressMonitor from "@/components/stress-monitor";
import { Spinner } from "@heroui/spinner";

interface ActiveConnection {
  address: string;
  is_connected: boolean;
  is_active: boolean;
  notify_uuid: string | null;
}

export default function IndexPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasActiveConnection, setHasActiveConnection] = useState(false);
  const [connection, setConnection] = useState<ActiveConnection | null>(null);

  useEffect(() => {
    // Initial check
    checkActiveConnection();

    // Poll for connections every 2 seconds
    const interval = setInterval(() => {
      checkActiveConnection();
    }, 2000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  const checkActiveConnection = async () => {
    try {
      const response = await fetch(
        "http://localhost:8000/api/active_connections"
      );
      const data = await response.json();

      if (data.status === "success" && data.connections.length > 0) {
        // Find the active connection
        const activeConn = data.connections.find(
          (conn: ActiveConnection) => conn.is_active && conn.is_connected
        );

        if (activeConn) {
          setConnection(activeConn);
          setHasActiveConnection(true);
        } else {
          setConnection(null);
          setHasActiveConnection(false);
        }
      } else {
        setConnection(null);
        setHasActiveConnection(false);
      }
    } catch (err) {
      console.error("Failed to check active connections:", err);
      setConnection(null);
      setHasActiveConnection(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DefaultLayout>
        <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10 min-h-[60vh]">
          <Spinner size="lg" label="Checking device connection..." />
        </section>
      </DefaultLayout>
    );
  }

  return (
    <DefaultLayout>
      <section className="flex flex-col items-center justify-center gap-4 py-8 md:py-10">
        {hasActiveConnection ? (
          <StressMonitor connection={connection} />
        ) : (
          <Search />
        )}
      </section>
    </DefaultLayout>
  );
}
