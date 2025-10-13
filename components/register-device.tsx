"use client";

import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Keyboard, Loader2, CheckCircle2, XCircle, Coins } from "lucide-react";
import { toast } from "sonner";

interface RegisterDeviceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess: () => void;
}

export function RegisterDevice({ open, onOpenChange, userId, onSuccess }: RegisterDeviceProps) {
  const [activeTab, setActiveTab] = useState<"scan" | "manual">("manual");
  const [manualCode, setManualCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);

  // Initialize QR scanner when scan tab is active
  useEffect(() => {
    if (activeTab === "scan" && open && !scannerActive) {
      initializeScanner();
    }
    
    return () => {
      stopScanner();
    };
  }, [activeTab, open]);

  // Cleanup scanner when dialog closes
  useEffect(() => {
    if (!open) {
      stopScanner();
      setManualCode("");
      setSuccessData(null);
    }
  }, [open]);

  const initializeScanner = async () => {
    try {
      if (scannerRef.current) {
        await stopScanner();
      }

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        onScanSuccess,
        onScanError
      );

      setScannerActive(true);
    } catch (error) {
      console.error("Error starting scanner:", error);
      toast.error("Unable to access camera. Please use manual entry.");
      setActiveTab("manual");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerActive) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
        setScannerActive(false);
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    console.log("QR Code scanned:", decodedText);
    await stopScanner();
    await handleRegister(decodedText);
  };

  const onScanError = (error: any) => {
    // Ignore scan errors (they happen constantly while scanning)
    // console.warn("QR scan error:", error);
  };

  const handleRegister = async (code: string) => {
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/devices/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code.toUpperCase(),
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to register device");
      }

      // Show success message
      setSuccessData(data);
      toast.success(`Device registered! +${data.ecoCoinsEarned} eco coins 🎉`);
      
      // Wait a moment to show success, then close and refresh
      setTimeout(() => {
        onSuccess();
        onOpenChange(false);
      }, 2000);
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to register device");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleRegister(manualCode.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Register New Device
          </DialogTitle>
          <DialogDescription>
            Scan the QR code on your device or enter the code manually
          </DialogDescription>
        </DialogHeader>

        {successData ? (
          <div className="space-y-4 py-4">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <Alert className="border-green-500">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>{successData.message}</strong>
                <div className="mt-2 space-y-1 text-sm">
                  <p>Device: {successData.deviceInfo.brand} {successData.deviceInfo.model}</p>
                  <p className="flex items-center gap-1">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    Earned: <strong>+{successData.ecoCoinsEarned}</strong> eco coins
                  </p>
                  <p>New Balance: <strong>{successData.newBalance}</strong> eco coins</p>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "scan" | "manual")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="scan" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Scan QR
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <Keyboard className="h-4 w-4" />
                Enter Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="scan" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">QR Code Scanner</CardTitle>
                  <CardDescription>
                    Position the QR code within the frame
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    id="qr-reader"
                    ref={scannerDivRef}
                    className="w-full rounded-lg overflow-hidden border-2 border-dashed border-gray-300"
                    style={{ minHeight: "300px" }}
                  />
                  {!scannerActive && (
                    <div className="flex justify-center mt-4">
                      <Button onClick={initializeScanner} disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Camera className="mr-2 h-4 w-4" />
                            Start Camera
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Manual Code Entry</CardTitle>
                  <CardDescription>
                    Enter the 13-character code from your device
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Input
                        placeholder="ABCD1234-2500"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                        maxLength={13}
                        className="font-mono text-lg text-center"
                        disabled={isLoading}
                      />
                      <p className="text-xs text-muted-foreground text-center">
                        Format: 8 characters, hyphen, 4 digits
                      </p>
                    </div>
                    
                    <Alert>
                      <AlertDescription className="text-sm">
                        <strong>Demo Codes:</strong>
                        <ul className="mt-2 space-y-1 text-xs">
                          <li>APIP1301-2500 (iPhone 13 - 2500 coins)</li>
                          <li>DELLXPS1-3500 (Dell XPS 13 - 3500 coins)</li>
                          <li>APIPAD91-2200 (iPad 9th Gen - 2200 coins)</li>
                        </ul>
                      </AlertDescription>
                    </Alert>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading || manualCode.length < 13}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Registering...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Register Device
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
