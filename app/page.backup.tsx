"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Smartphone,
  Laptop,
  Monitor,
  Coins,
  Recycle,
  AlertTriangle,
  CheckCircle,
  Leaf,
  Shield,
  Zap,
  Bell,
  Wallet,
} from "lucide-react"

// Mock data for demonstration
const mockDevices = [
  {
    id: "1",
    name: "iPhone 12 Pro",
    type: "smartphone",
    health: 23,
    eolPrediction: "2 months",
    ecoCoins: 150,
    status: "critical",
    lastCheck: "2 hours ago",
    batteryHealth: 78,
    performanceScore: 65,
  },
  {
    id: "2",
    name: "MacBook Air M1",
    type: "laptop",
    health: 67,
    eolPrediction: "8 months",
    ecoCoins: 300,
    status: "good",
    lastCheck: "1 day ago",
    batteryHealth: 89,
    performanceScore: 85,
  },
  {
    id: "3",
    name: 'Dell Monitor 27"',
    type: "monitor",
    health: 45,
    eolPrediction: "4 months",
    ecoCoins: 80,
    status: "warning",
    lastCheck: "3 hours ago",
    batteryHealth: null,
    performanceScore: 72,
  },
]

const mockNotifications = [
  {
    id: "1",
    deviceName: "iPhone 12 Pro",
    message: "Device health critical - Ready for recycling",
    timestamp: "2 hours ago",
    type: "critical",
    ecoCoins: 150,
  },
  {
    id: "2",
    deviceName: 'Dell Monitor 27"',
    message: "Performance degradation detected",
    timestamp: "1 day ago",
    type: "warning",
    ecoCoins: 80,
  },
]

const getDeviceIcon = (type: string) => {
  switch (type) {
    case "smartphone":
      return <Smartphone className="h-5 w-5" />
    case "laptop":
      return <Laptop className="h-5 w-5" />
    case "monitor":
      return <Monitor className="h-5 w-5" />
    default:
      return <Smartphone className="h-5 w-5" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "critical":
      return "destructive"
    case "warning":
      return "secondary"
    case "good":
      return "default"
    default:
      return "default"
  }
}

export default function EcoCoinDashboard() {
  const [selectedDevice, setSelectedDevice] = useState(mockDevices[0])
  const [showRecycleDialog, setShowRecycleDialog] = useState(false)
  const [totalEcoCoins, setTotalEcoCoins] = useState(1250)
  const [activeTab, setActiveTab] = useState("dashboard")

  const handleRecycleAccept = (deviceId: string) => {
    const device = mockDevices.find((d) => d.id === deviceId)
    if (device) {
      setTotalEcoCoins((prev) => prev + device.ecoCoins)
      setShowRecycleDialog(false)
      // In real app, this would trigger blockchain transaction
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-primary rounded-lg p-2">
                <Leaf className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold font-serif text-primary">Eco-Coin</h1>
                <p className="text-sm text-muted-foreground">AI-Driven E-Waste Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-accent/10 px-3 py-2 rounded-lg">
                <Coins className="h-5 w-5 text-accent" />
                <span className="font-semibold text-accent">{totalEcoCoins}</span>
                <span className="text-sm text-muted-foreground">Eco-Coins</span>
              </div>
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Avatar>
                <AvatarImage src="/placeholder.svg?height=32&width=32" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="devices">My Devices</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
            <TabsTrigger value="recycle">Recycle</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3</div>
                  <p className="text-xs text-muted-foreground">+1 from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Eco-Coins Earned</CardTitle>
                  <Coins className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-accent">{totalEcoCoins}</div>
                  <p className="text-xs text-muted-foreground">+180 this month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Devices Recycled</CardTitle>
                  <Recycle className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">7</div>
                  <p className="text-xs text-muted-foreground">Lifetime total</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">CO₂ Saved</CardTitle>
                  <Leaf className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">42kg</div>
                  <p className="text-xs text-muted-foreground">Environmental impact</p>
                </CardContent>
              </Card>
            </div>

            {/* Critical Alerts */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold font-serif">AI Alerts</h2>
              {mockNotifications.map((notification) => (
                <Alert
                  key={notification.id}
                  className={notification.type === "critical" ? "border-destructive" : "border-secondary"}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="flex items-center justify-between">
                    <div>
                      <strong>{notification.deviceName}</strong> - {notification.message}
                      <div className="text-sm text-muted-foreground mt-1">{notification.timestamp}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-accent/10 text-accent">
                        +{notification.ecoCoins} Eco-Coins
                      </Badge>
                      {notification.type === "critical" && (
                        <div className="flex space-x-2">
                          <Button size="sm" onClick={() => handleRecycleAccept(notification.id)}>
                            Accept
                          </Button>
                          <Button size="sm" variant="outline">
                            Snooze
                          </Button>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>

            {/* Device Health Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif">Device Health Monitoring</CardTitle>
                  <CardDescription>AI-powered end-of-life predictions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mockDevices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getDeviceIcon(device.type)}
                        <div>
                          <p className="font-medium">{device.name}</p>
                          <p className="text-sm text-muted-foreground">Health: {device.health}%</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={getStatusColor(device.status)}>{device.status}</Badge>
                        <p className="text-sm text-muted-foreground mt-1">EOL: {device.eolPrediction}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-serif">Blockchain Transparency</CardTitle>
                  <CardDescription>Secure and verifiable transactions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-primary/5 rounded-lg">
                    <Shield className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">Secure Ledger</p>
                      <p className="text-sm text-muted-foreground">All transactions recorded on blockchain</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-accent/5 rounded-lg">
                    <Zap className="h-8 w-8 text-accent" />
                    <div>
                      <p className="font-medium">Smart Contracts</p>
                      <p className="text-sm text-muted-foreground">Automated reward distribution</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-secondary/50 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">Verified Recycling</p>
                      <p className="text-sm text-muted-foreground">Fraud prevention algorithms</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="devices" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {mockDevices.map((device) => (
                <Card
                  key={device.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedDevice(device)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getDeviceIcon(device.type)}
                        <CardTitle className="text-lg">{device.name}</CardTitle>
                      </div>
                      <Badge variant={getStatusColor(device.status)}>{device.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Device Health</span>
                        <span>{device.health}%</span>
                      </div>
                      <Progress value={device.health} className="h-2" />
                    </div>
                    {device.batteryHealth && (
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Battery Health</span>
                          <span>{device.batteryHealth}%</span>
                        </div>
                        <Progress value={device.batteryHealth} className="h-2" />
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-sm text-muted-foreground">EOL Prediction</span>
                      <span className="font-medium">{device.eolPrediction}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Reward Value</span>
                      <div className="flex items-center space-x-1">
                        <Coins className="h-4 w-4 text-accent" />
                        <span className="font-medium text-accent">{device.ecoCoins}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="rewards" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif flex items-center space-x-2">
                    <Wallet className="h-5 w-5" />
                    <span>Eco-Coin Wallet</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-6 bg-accent/10 rounded-lg">
                    <div className="text-4xl font-bold text-accent mb-2">{totalEcoCoins}</div>
                    <p className="text-muted-foreground">Total Eco-Coins</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>This Month</span>
                      <span className="text-accent">+180</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Month</span>
                      <span className="text-accent">+95</span>
                    </div>
                    <div className="flex justify-between">
                      <span>All Time</span>
                      <span className="text-accent">{totalEcoCoins}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-serif">Redeem Rewards</CardTitle>
                  <CardDescription>Use your Eco-Coins for discounts and rewards</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">10% Off New Device</p>
                        <p className="text-sm text-muted-foreground">Electronics store discount</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-accent">100 Coins</p>
                        <Button size="sm" variant="outline">
                          Redeem
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Tree Planting</p>
                        <p className="text-sm text-muted-foreground">Plant a tree in your name</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-accent">50 Coins</p>
                        <Button size="sm" variant="outline">
                          Redeem
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Carbon Offset</p>
                        <p className="text-sm text-muted-foreground">Offset 1 ton of CO₂</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-accent">200 Coins</p>
                        <Button size="sm" variant="outline">
                          Redeem
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recycle" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Recycling Process</CardTitle>
                <CardDescription>Step-by-step guide to recycle your devices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center space-y-3">
                    <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                      <AlertTriangle className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold">1. AI Detection</h3>
                    <p className="text-sm text-muted-foreground">
                      Our AI monitors your device health and predicts end-of-life
                    </p>
                  </div>
                  <div className="text-center space-y-3">
                    <div className="bg-accent/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                      <CheckCircle className="h-8 w-8 text-accent" />
                    </div>
                    <h3 className="font-semibold">2. Accept Recycling</h3>
                    <p className="text-sm text-muted-foreground">Choose to recycle when prompted or snooze for later</p>
                  </div>
                  <div className="text-center space-y-3">
                    <div className="bg-secondary/50 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                      <Coins className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold">3. Earn Rewards</h3>
                    <p className="text-sm text-muted-foreground">
                      Receive Eco-Coins automatically via blockchain smart contracts
                    </p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Ready to Recycle</h3>
                  <div className="space-y-3">
                    {mockDevices
                      .filter((d) => d.status === "critical")
                      .map((device) => (
                        <div
                          key={device.id}
                          className="flex items-center justify-between p-4 border rounded-lg bg-destructive/5"
                        >
                          <div className="flex items-center space-x-3">
                            {getDeviceIcon(device.type)}
                            <div>
                              <p className="font-medium">{device.name}</p>
                              <p className="text-sm text-muted-foreground">Health: {device.health}% - Critical</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="font-medium text-accent">+{device.ecoCoins} Eco-Coins</p>
                              <p className="text-sm text-muted-foreground">Reward value</p>
                            </div>
                            <div className="flex space-x-2">
                              <Button onClick={() => handleRecycleAccept(device.id)}>Accept Recycling</Button>
                              <Button variant="outline">Snooze</Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
