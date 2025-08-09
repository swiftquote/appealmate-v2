"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Users, 
  FileText, 
  CreditCard, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  Ban,
  Settings,
  Download,
  RefreshCw
} from "lucide-react"

interface AdminStats {
  totalUsers: number
  totalAppeals: number
  totalRevenue: number
  successfulAppeals: number
  pendingAppeals: number
  recentUsers: number
  activeSubscriptions: number
  ocrAccuracy: number
}

interface User {
  id: string
  email: string
  name?: string
  planType: string
  planExpiry?: string
  appealsUsed: number
  createdAt: string
  appeals: any[]
}

interface Appeal {
  id: string
  pcnNumber: string
  vrm: string
  status: string
  councilOrCompany: string
  createdAt: string
  user: {
    email: string
    name?: string
  }
}

export default function AdminPanel() {
  const { data: session } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [recentUsers, setRecentUsers] = useState<User[]>([])
  const [recentAppeals, setRecentAppeals] = useState<Appeal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "appeals">("overview")

  // Simple admin check - in production, this should be more secure
  const isAdmin = session?.user?.email?.includes("admin") || session?.user?.email === "admin@example.com"

  useEffect(() => {
    if (!session) {
      router.push("/")
      return
    }

    if (!isAdmin) {
      router.push("/dashboard")
      return
    }

    loadAdminData()
  }, [session, router, isAdmin])

  const loadAdminData = async () => {
    try {
      setLoading(true)

      // Load stats
      const statsResponse = await fetch("/api/admin/stats")
      if (!statsResponse.ok) throw new Error("Failed to load stats")
      const statsData = await statsResponse.json()
      setStats(statsData.stats)

      // Load recent users
      const usersResponse = await fetch("/api/admin/users?limit=10")
      if (!usersResponse.ok) throw new Error("Failed to load users")
      const usersData = await usersResponse.json()
      setRecentUsers(usersData.users)

      // Load recent appeals
      const appealsResponse = await fetch("/api/admin/appeals?limit=10")
      if (!appealsResponse.ok) throw new Error("Failed to load appeals")
      const appealsData = await appealsResponse.json()
      setRecentAppeals(appealsData.appeals)

    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load admin data")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600 bg-green-50"
      case "paid": return "text-blue-600 bg-blue-50"
      case "draft": return "text-yellow-600 bg-yellow-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case "subscriber": return "text-purple-600 bg-purple-50"
      case "single_use": return "text-blue-600 bg-blue-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Ban className="h-5 w-5 text-red-600" />
              <span>Access Denied</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">You don't have permission to access the admin panel.</p>
            <Button className="w-full mt-4" onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
              <Badge variant="outline">Administrator</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={loadAdminData}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                <Eye className="mr-2 h-4 w-4" />
                User View
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("overview")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "overview"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "users"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveTab("appeals")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "appeals"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Appeals
              </button>
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && stats && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                      <p className="text-xs text-green-600">+{stats.recentUsers} this week</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Appeals</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalAppeals}</p>
                      <p className="text-xs text-gray-600">{stats.successfulAppeals} successful</p>
                    </div>
                    <FileText className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Revenue</p>
                      <p className="text-2xl font-bold text-gray-900">£{stats.totalRevenue.toFixed(2)}</p>
                      <p className="text-xs text-green-600">
                        {stats.activeSubscriptions} active subs
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">OCR Accuracy</p>
                      <p className="text-2xl font-bold text-gray-900">{(stats.ocrAccuracy * 100).toFixed(1)}%</p>
                      <p className="text-xs text-yellow-600">Needs improvement</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Users</CardTitle>
                  <CardDescription>New user registrations in the last 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentUsers.slice(0, 5).map((user) => (
                      <div key={user.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{user.name || user.email}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        <div className="text-right">
                          <Badge className={getPlanColor(user.planType)}>
                            {user.planType.replace("_", " ")}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(user.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Appeals</CardTitle>
                  <CardDescription>Latest appeal submissions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentAppeals.slice(0, 5).map((appeal) => (
                      <div key={appeal.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{appeal.pcnNumber}</p>
                          <p className="text-sm text-gray-600">
                            {appeal.user.name || appeal.user.email}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge className={getStatusColor(appeal.status)}>
                            {appeal.status}
                          </Badge>
                          <p className="text-xs text-gray-500 mt-1">
                            {appeal.councilOrCompany}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Manage user accounts and subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Appeals Used</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.name || "N/A"}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPlanColor(user.planType)}>
                          {user.planType.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.appealsUsed}</TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Appeals Tab */}
        {activeTab === "appeals" && (
          <Card>
            <CardHeader>
              <CardTitle>All Appeals</CardTitle>
              <CardDescription>Track and manage all appeal submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PCN Number</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Issuer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAppeals.map((appeal) => (
                    <TableRow key={appeal.id}>
                      <TableCell>
                        <p className="font-medium">{appeal.pcnNumber}</p>
                        <p className="text-sm text-gray-600">{appeal.vrm}</p>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{appeal.user.name || "N/A"}</p>
                        <p className="text-sm text-gray-600">{appeal.user.email}</p>
                      </TableCell>
                      <TableCell>{appeal.councilOrCompany}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(appeal.status)}>
                          {appeal.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(appeal.createdAt)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}