"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  Loader2,
  LogOut,
  Plus,
} from "lucide-react"
import { dashboardApi, deviceApi, notificationApi } from "@/lib/api"
import type { Device, Notification as NotificationType, DashboardData } from "@/lib/types"
import { toast } from "sonner"
import { RegisterDevice } from "@/components/register-device"

// Get user from localStorage
const getLoggedInUser = () => {
  if (typeof window === 'undefined') return null
  const userStr = localStorage.getItem('ecocoin_user')
  return userStr ? JSON.parse(userStr) : null
}

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
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [notifications, setNotifications] = useState<NotificationType[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [registerDeviceOpen, setRegisterDeviceOpen] = useState(false)

  // Check authentication on mount
  useEffect(() => {
    const user = getLoggedInUser()
    if (!user) {
      router.push('/login')
      return
    }
    setCurrentUser(user)
  }, [router])

  // Fetch dashboard data when user is loaded
  useEffect(() => {
    if (currentUser) {
      fetchDashboardData()
      fetchNotifications()
    }
  }, [currentUser])

  const fetchDashboardData = async () => {
    if (!currentUser) return
    
    try {
      setLoading(true)
      const response = await dashboardApi.getData(currentUser._id)
      if (response.success && response.data) {
        setDashboardData(response.data)
      } else {
        toast.error(response.error || "Failed to load dashboard data")
      }
    } catch (error: any) {
      toast.error("Error loading dashboard")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchNotifications = async () => {
    if (!currentUser) return
    
    try {
      const response = await notificationApi.getByUserId(currentUser._id, false)
      if (response.success && response.data) {
        setNotifications(response.data)
      }
    } catch (error) {
      console.error("Error loading notifications:", error)
    }
  }

  const handleRecycleAccept = async (deviceId: string) => {
    if (!currentUser) return
    
    try {
      const response = await deviceApi.recycle(deviceId, currentUser._id)
      if (response.success && response.data) {
        toast.success(
          `Recycled successfully! Earned ${response.data.coinsAwarded} Eco-Coins`
        )
        // Refresh data
        fetchDashboardData()
        fetchNotifications()
      } else {
        toast.error(response.error || "Failed to recycle device")
      }
    } catch (error: any) {
      toast.error("Error recycling device")
      console.error(error)
    }
  }

  const handleSnoozeNotification = async (notificationId: string) => {
    try {
      await notificationApi.markAsRead(notificationId)
      toast.info("Notification snoozed")
      fetchNotifications()
    } catch (error) {
      console.error("Error snoozing notification:", error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('ecocoin_user')
    toast.success("Logged out successfully")
    router.push('/login')
  }

  const handleRegistrationSuccess = () => {
    // Refresh dashboard data after successful registration
    fetchDashboardData()
    toast.success("Device registered successfully! Your dashboard has been updated.")
  }

  // Show loading while checking auth
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error Loading Dashboard</CardTitle>
            <CardDescription>
              Unable to load dashboard data. Please check your configuration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Make sure you have:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>MongoDB running</li>
              <li>Run the seed script: <code>npm run seed</code></li>
              <li>Updated CURRENT_USER_ID in the code</li>
            </ul>
            <Button onClick={() => window.location.reload()} className="mt-4 w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { user, devices, earnings } = dashboardData

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
                <span className="font-semibold text-accent">{user.totalEcoCoins}</span>
                <span className="text-sm text-muted-foreground">Eco-Coins</span>
              </div>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 h-2 w-2 bg-destructive rounded-full" />
                )}
              </Button>
              <Avatar>
                <AvatarImage src={user.avatar} />
                <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                <LogOut className="h-5 w-5" />
              </Button>
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
                  <div className="text-2xl font-bold">{user.devicesOwned}</div>
                  <p className="text-xs text-muted-foreground">Active devices</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Eco-Coins Earned</CardTitle>
                  <Coins className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-accent">{user.totalEcoCoins}</div>
                  <p className="text-xs text-muted-foreground">+{earnings.thisMonth} this month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Devices Recycled</CardTitle>
                  <Recycle className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{user.devicesRecycled}</div>
                  <p className="text-xs text-muted-foreground">Lifetime total</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">CO₂ Saved</CardTitle>
                  <Leaf className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{user.co2Saved}kg</div>
                  <p className="text-xs text-muted-foreground">Environmental impact</p>
                </CardContent>
              </Card>
            </div>

            {/* Critical Alerts */}
            {notifications.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold font-serif">AI Alerts</h2>
                {notifications.map((notification) => (
                  <Alert
                    key={notification._id}
                    className={
                      notification.type === "critical" ? "border-destructive" : "border-secondary"
                    }
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <div>
                        <strong>{notification.deviceName}</strong> - {notification.message}
                        <div className="text-sm text-muted-foreground mt-1">
                          {new Date(notification.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="bg-accent/10 text-accent">
                          +{notification.ecoCoins} Eco-Coins
                        </Badge>
                        {notification.type === "critical" && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleRecycleAccept(notification.deviceId)}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSnoozeNotification(notification._id)}
                            >
                              Snooze
                            </Button>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            {/* Device Health Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="font-serif">Device Health Monitoring</CardTitle>
                  <CardDescription>AI-powered end-of-life predictions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {devices.map((device) => (
                    <div
                      key={device._id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {getDeviceIcon(device.type)}
                        <div>
                          <p className="font-medium">{device.name}</p>
                          <p className="text-sm text-muted-foreground">Health: {device.health}%</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={getStatusColor(device.status)}>{device.status}</Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          EOL: {device.eolPrediction}
                        </p>
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
                      <p className="text-sm text-muted-foreground">
                        All transactions recorded on blockchain
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-accent/5 rounded-lg">
                    <Zap className="h-8 w-8 text-accent" />
                    <div>
                      <p className="font-medium">Smart Contracts</p>
                      <p className="text-sm text-muted-foreground">
                        Automated reward distribution
                      </p>
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
            {/* Register Device Button */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold font-serif">My Devices</h2>
                <p className="text-muted-foreground">Manage and monitor your registered devices</p>
              </div>
              <Button onClick={() => setRegisterDeviceOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Register New Device
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {devices.map((device) => (
                <Card key={device._id} className="hover:shadow-lg transition-shadow">
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
                    <div className="text-4xl font-bold text-accent mb-2">
                      {user.totalEcoCoins}
                    </div>
                    <p className="text-muted-foreground">Total Eco-Coins</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>This Month</span>
                      <span className="text-accent">+{earnings.thisMonth}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Month</span>
                      <span className="text-accent">+{earnings.lastMonth}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>All Time</span>
                      <span className="text-accent">{earnings.allTime}</span>
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
                  <p className="text-sm text-muted-foreground">
                    Connect to rewards API to see available offers
                  </p>
                  <Button className="w-full">Browse Rewards</Button>
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
                    <p className="text-sm text-muted-foreground">
                      Choose to recycle when prompted or snooze for later
                    </p>
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
                    {devices
                      .filter((d) => d.status === "critical")
                      .map((device) => (
                        <div
                          key={device._id}
                          className="flex items-center justify-between p-4 border rounded-lg bg-destructive/5"
                        >
                          <div className="flex items-center space-x-3">
                            {getDeviceIcon(device.type)}
                            <div>
                              <p className="font-medium">{device.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Health: {device.health}% - Critical
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="font-medium text-accent">+{device.ecoCoins} Eco-Coins</p>
                              <p className="text-sm text-muted-foreground">Reward value</p>
                            </div>
                            <Button onClick={() => handleRecycleAccept(device._id)}>
                              Accept Recycling
                            </Button>
                          </div>
                        </div>
                      ))}
                    {devices.filter((d) => d.status === "critical").length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No devices ready for recycling at the moment
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Register Device Dialog */}
      {currentUser && (
        <RegisterDevice
          open={registerDeviceOpen}
          onOpenChange={setRegisterDeviceOpen}
          userId={currentUser._id}
          onSuccess={handleRegistrationSuccess}
        />
      )}
    </div>
  )
}
