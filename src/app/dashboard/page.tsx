"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  FileText, 
  Plus, 
  Download, 
  Copy, 
  ExternalLink, 
  Calendar, 
  MapPin, 
  Car,
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  User
} from "lucide-react"
import { toast } from "sonner"

interface Appeal {
  id: string
  pcnNumber: string
  vrm: string
  contraventionCode: string
  contraventionText: string
  issueDateTime: string
  location: string
  status: string
  councilOrCompany: string
  issuerType: string
  letterText?: string
  createdAt: string
}

interface UserStats {
  totalAppeals: number
  successfulAppeals: number
  pendingAppeals: number
  planType: string
  planExpiry?: string
  appealsUsed: number
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [appeals, setAppeals] = useState<Appeal[]>([])
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
      return
    }

    if (session) {
      loadDashboardData()
    }
  }, [session, status, router])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load user appeals
      const appealsResponse = await fetch(`/api/appeals?userId=${session?.user?.email}`)
      if (!appealsResponse.ok) {
        throw new Error("Failed to load appeals")
      }
      const appealsData = await appealsResponse.json()
      setAppeals(appealsData.appeals || [])

      // Load user stats
      const statsResponse = await fetch(`/api/user/stats?userId=${session?.user?.email}`)
      if (!statsResponse.ok) {
        throw new Error("Failed to load user stats")
      }
      const statsData = await statsResponse.json()
      setUserStats(statsData.stats)

    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }

  const copyLetterToClipboard = (letter: string) => {
    navigator.clipboard.writeText(letter)
    toast.success("Letter copied to clipboard")
  }

  const downloadLetterPDF = (appeal: Appeal) => {
    // Placeholder for PDF generation
    toast.success("PDF download started")
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-600 bg-green-50"
      case "paid": return "text-blue-600 bg-blue-50"
      case "draft": return "text-yellow-600 bg-yellow-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4" />
      case "paid": return <Clock className="h-4 w-4" />
      case "draft": return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    })
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {session.user?.name}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => router.push("/")}>
                <Plus className="mr-2 h-4 w-4" />
                New Appeal
              </Button>
              <Button variant="outline" onClick={() => signOut()}>
                Sign Out
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

        {/* Stats Overview */}
        {userStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Appeals</p>
                    <p className="text-2xl font-bold text-gray-900">{userStats.totalAppeals}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Successful</p>
                    <p className="text-2xl font-bold text-green-600">{userStats.successfulAppeals}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{userStats.pendingAppeals}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Plan</p>
                    <p className="text-lg font-bold text-purple-600 capitalize">{userStats.planType.replace("_", " ")}</p>
                    {userStats.planType === "subscriber" && userStats.planExpiry && (
                      <p className="text-xs text-gray-500">
                        Expires {formatDate(userStats.planExpiry)}
                      </p>
                    )}
                    {userStats.planType === "single_use" && (
                      <p className="text-xs text-gray-500">
                        {userStats.appealsUsed} used
                      </p>
                    )}
                  </div>
                  <CreditCard className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Appeals List */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Your Appeals</CardTitle>
                <CardDescription>
                  Track the status of your parking ticket appeals
                </CardDescription>
              </CardHeader>
              <CardContent>
                {appeals.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No appeals yet</h3>
                    <p className="text-gray-600 mb-4">
                      Start your first appeal by uploading a parking ticket
                    </p>
                    <Button onClick={() => router.push("/")}>
                      <Plus className="mr-2 h-4 w-4" />
                      Start New Appeal
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {appeals.map((appeal) => (
                      <div key={appeal.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="font-medium text-gray-900">{appeal.pcnNumber}</h3>
                              <Badge className={getStatusColor(appeal.status)}>
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(appeal.status)}
                                  <span className="capitalize">{appeal.status}</span>
                                </div>
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                              <div className="flex items-center space-x-2">
                                <Car className="h-4 w-4" />
                                <span>{appeal.vrm}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <MapPin className="h-4 w-4" />
                                <span className="truncate">{appeal.location}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(appeal.issueDateTime)}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4" />
                                <span>{appeal.contraventionCode}</span>
                              </div>
                            </div>

                            <p className="text-sm text-gray-600 mt-2">
                              {appeal.councilOrCompany} ({appeal.issuerType})
                            </p>
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            {appeal.letterText && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyLetterToClipboard(appeal.letterText!)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => downloadLetterPDF(appeal)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              onClick={() => router.push(`/appeal/${appeal.id}`)}
                            >
                              View
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => router.push("/")} 
                  className="w-full justify-start"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Appeal
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.open("#", "_blank")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Appeal Guide
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.open("#", "_blank")}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Success Stories
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{session.user?.name}</p>
                    <p className="text-sm text-gray-600">{session.user?.email}</p>
                  </div>
                </div>
                
                {userStats && (
                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">Plan Type</span>
                      <Badge variant="outline" className="capitalize">
                        {userStats.planType.replace("_", " ")}
                      </Badge>
                    </div>
                    
                    {userStats.planType === "subscriber" && userStats.planExpiry && (
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Renews</span>
                        <span className="text-sm">{formatDate(userStats.planExpiry)}</span>
                      </div>
                    )}
                    
                    {userStats.planType === "single_use" && (
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Appeals Used</span>
                        <span className="text-sm">{userStats.appealsUsed}</span>
                      </div>
                    )}
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-4"
                  onClick={() => signOut()}
                >
                  Sign Out
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Check our guides and FAQs for help with your appeals.
                </p>
                <div className="space-y-2">
                  <Button variant="link" className="w-full justify-start p-0 h-auto">
                    FAQ
                  </Button>
                  <Button variant="link" className="w-full justify-start p-0 h-auto">
                    Contact Support
                  </Button>
                  <Button variant="link" className="w-full justify-start p-0 h-auto">
                    Appeal Tips
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}