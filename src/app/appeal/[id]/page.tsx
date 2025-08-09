"use client"

import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowLeft, 
  Download, 
  Copy, 
  CheckCircle, 
  AlertTriangle, 
  CreditCard, 
  FileText, 
  Shield,
  Clock,
  MapPin,
  Car,
  Gavel,
  ExternalLink
} from "lucide-react"
import { toast } from "sonner"

interface AppealData {
  id: string
  issuerType: string
  councilOrCompany: string
  pcnNumber: string
  vrm: string
  vehicleMake?: string
  vehicleModel?: string
  vehicleColour?: string
  contraventionCode: string
  contraventionText: string
  issueDateTime: string
  location: string
  confirmedVrm: string
  confirmedLocation: string
  confirmedDateTime: string
  confirmedContravention: string
  paid: boolean
  paidUntil?: string
  paymentMethod?: string
  permitType?: string
  loadingUnloading: boolean
  passengerDropoff: boolean
  blueBadge: boolean
  medicalEmergency: boolean
  signageVisible: boolean
  markingsVisible: boolean
  noObservationPeriod: boolean
  lateCouncilReply: boolean
  additionalNotes?: string
  status: string
  primaryDefence?: string
  supportingDefences?: string
  letterText?: string
  createdAt: string
}

interface RulesAnalysis {
  primaryDefence: {
    id: string
    name: string
    description: string
    strength: string
    category: string
    reasoning: string
  }
  supportingDefences: Array<{
    id: string
    name: string
    description: string
    strength: string
    category: string
    reasoning: string
  }>
  contraventionCategory: string
}

interface LetterGeneration {
  letter: string
  analysis: {
    caseAssessment: string
    keyLegalPoints: string[]
    evidenceRecommendations: string[]
    successLikelihood: string
    additionalAdvice: string
  }
  evidenceRecommendations: string[]
  successLikelihood: string
}

export default function AppealDetails() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const [appealData, setAppealData] = useState<AppealData | null>(null)
  const [rulesAnalysis, setRulesAnalysis] = useState<RulesAnalysis | null>(null)
  const [letterGeneration, setLetterGeneration] = useState<LetterGeneration | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentStep, setPaymentStep] = useState<"analysis" | "payment" | "generating" | "complete">("analysis")

  const appealId = params.id as string

  useEffect(() => {
    if (!session) {
      router.push("/")
      return
    }

    // Check for payment success/cancel parameters
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get("success")
    const canceled = urlParams.get("canceled")
    const plan = urlParams.get("plan")

    if (success === "true" && plan) {
      // Payment was successful, generate the letter
      setPaymentStep("generating")
      loadAppealData().then(() => {
        // After loading appeal data, proceed with letter generation
        setTimeout(() => {
          generateLetter()
        }, 1000)
      })
    } else if (canceled === "true") {
      // Payment was canceled
      setPaymentStep("payment")
      setError("Payment was canceled. You can try again when ready.")
    } else {
      // Normal page load
      loadAppealData()
    }
  }, [session, router, appealId])

  const loadAppealData = async () => {
    try {
      const response = await fetch(`/api/appeals/${appealId}`)
      if (!response.ok) {
        throw new Error("Failed to load appeal data")
      }
      const data = await response.json()
      setAppealData(data.appeal)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to load appeal")
    }
  }

  const analyzeAppeal = async () => {
    setLoading(true)
    setError(null)

    try {
      // Prepare data for rules engine
      const rulesRequest = {
        issuerType: appealData!.issuerType,
        contraventionCode: appealData!.contraventionCode,
        issueDateTime: appealData!.issueDateTime,
        paid: appealData!.paid,
        paidUntil: appealData!.paidUntil,
        paymentMethod: appealData!.paymentMethod,
        permitType: appealData!.permitType,
        loadingUnloading: appealData!.loadingUnloading,
        passengerDropoff: appealData!.passengerDropoff,
        blueBadge: appealData!.blueBadge,
        medicalEmergency: appealData!.medicalEmergency,
        signageVisible: appealData!.signageVisible,
        markingsVisible: appealData!.markingsVisible,
        noObservationPeriod: appealData!.noObservationPeriod,
        lateCouncilReply: appealData!.lateCouncilReply
      }

      const rulesResponse = await fetch("/api/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rulesRequest)
      })

      if (!rulesResponse.ok) {
        throw new Error("Failed to analyze appeal")
      }

      const rulesResult = await rulesResponse.json()
      setRulesAnalysis(rulesResult)
      setPaymentStep("payment")

    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to analyze appeal")
    } finally {
      setLoading(false)
    }
  }

  const processPayment = async (planType: "single" | "annual") => {
    setLoading(true)
    setError(null)

    try {
      const paymentRequest = {
        appealId,
        planType,
        userId: session?.user?.email
      }

      const paymentResponse = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentRequest)
      })

      if (!paymentResponse.ok) {
        throw new Error("Failed to create payment session")
      }

      const paymentResult = await paymentResponse.json()
      
      // Redirect to Stripe checkout
      if (paymentResult.url) {
        window.location.href = paymentResult.url
      } else {
        throw new Error("No checkout URL returned")
      }
      
    } catch (error) {
      setError(error instanceof Error ? error.message : "Payment failed")
    } finally {
      setLoading(false)
    }
  }

  const generateLetter = async () => {
    try {
      const letterRequest = {
        appealData,
        rulesAnalysis
      }

      const letterResponse = await fetch("/api/generate-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(letterRequest)
      })

      if (!letterResponse.ok) {
        throw new Error("Failed to generate letter")
      }

      const letterResult = await letterResponse.json()
      setLetterGeneration(letterResult)
      setPaymentStep("complete")

      // Update appeal status
      await fetch(`/api/appeals/${appealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "completed",
          letterText: letterResult.letter,
          primaryDefence: JSON.stringify(letterResult.primaryDefence),
          supportingDefences: JSON.stringify(letterResult.supportingDefences)
        })
      })

    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to generate letter")
      setPaymentStep("payment")
    }
  }

  const copyToClipboard = () => {
    if (letterGeneration?.letter) {
      navigator.clipboard.writeText(letterGeneration.letter)
      toast.success("Letter copied to clipboard")
    }
  }

  const downloadPDF = () => {
    if (letterGeneration?.letter) {
      // Here you would generate and download PDF
      toast.success("PDF download started")
    }
  }

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case "high": return "text-green-600 bg-green-50"
      case "medium": return "text-yellow-600 bg-yellow-50"
      case "low": return "text-red-600 bg-red-50"
      default: return "text-gray-600 bg-gray-50"
    }
  }

  if (!appealData) {
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
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-xl font-semibold">Appeal Details</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">
              {paymentStep === "analysis" && "Step 1: Case Analysis"}
              {paymentStep === "payment" && "Step 2: Payment"}
              {paymentStep === "generating" && "Step 3: Generating Letter"}
              {paymentStep === "complete" && "Complete"}
            </span>
            <Badge variant="outline">
              {paymentStep === "analysis" && "Analyzing"}
              {paymentStep === "payment" && "Payment Required"}
              {paymentStep === "generating" && "Generating"}
              {paymentStep === "complete" && "Ready"}
            </Badge>
          </div>
          <Progress 
            value={
              paymentStep === "analysis" ? 25 :
              paymentStep === "payment" ? 50 :
              paymentStep === "generating" ? 75 : 100
            } 
            className="h-2" 
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Appeal Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Ticket Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">PCN Number</p>
                    <p className="font-medium">{appealData.pcnNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Issuer</p>
                    <p className="font-medium">{appealData.councilOrCompany}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Vehicle</p>
                    <p className="font-medium">{appealData.confirmedVrm}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Contravention</p>
                    <p className="font-medium">{appealData.contraventionCode}</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Date & Time</p>
                      <p className="font-medium">{new Date(appealData.confirmedDateTime).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium">{appealData.confirmedLocation}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Case Analysis */}
            {rulesAnalysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Gavel className="h-5 w-5" />
                    <span>Case Analysis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Primary Defence</p>
                      <div className={`p-3 rounded-lg ${getStrengthColor(rulesAnalysis.primaryDefence.strength)}`}>
                        <h4 className="font-medium">{rulesAnalysis.primaryDefence.name}</h4>
                        <p className="text-sm mt-1">{rulesAnalysis.primaryDefence.description}</p>
                        <p className="text-xs mt-2">{rulesAnalysis.primaryDefence.reasoning}</p>
                      </div>
                    </div>

                    {rulesAnalysis.supportingDefences.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Supporting Defences</p>
                        <div className="space-y-2">
                          {rulesAnalysis.supportingDefences.map((defence, index) => (
                            <div key={index} className={`p-3 rounded-lg ${getStrengthColor(defence.strength)}`}>
                              <h5 className="font-medium text-sm">{defence.name}</h5>
                              <p className="text-xs mt-1">{defence.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generated Letter */}
            {letterGeneration && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5" />
                      <span>Generated Appeal Letter</span>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={copyToClipboard}>
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button size="sm" onClick={downloadPDF}>
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Success likelihood: <span className={`font-medium ${
                      letterGeneration.successLikelihood === "high" ? "text-green-600" :
                      letterGeneration.successLikelihood === "medium" ? "text-yellow-600" : "text-red-600"
                    }`}>{letterGeneration.successLikelihood}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {letterGeneration.letter}
                    </pre>
                  </div>
                  
                  {letterGeneration.analysis.evidenceRecommendations.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Recommended Evidence:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {letterGeneration.analysis.evidenceRecommendations.map((evidence, index) => (
                          <li key={index}>• {evidence}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Actions & Summary */}
          <div className="space-y-6">
            {/* Action Card */}
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentStep === "analysis" && (
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      We'll analyze your case and identify the strongest defences for your appeal.
                    </p>
                    <Button 
                      onClick={analyzeAppeal} 
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? "Analyzing..." : "Analyze My Case"}
                    </Button>
                  </div>
                )}

                {paymentStep === "payment" && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-4">
                        Unlock your personalized appeal letter with our AI-powered system.
                      </p>
                      <div className="space-y-3">
                        <div className="border rounded-lg p-4">
                          <h4 className="font-medium">Single Appeal</h4>
                          <p className="text-2xl font-bold text-blue-600">£2.99</p>
                          <p className="text-xs text-gray-500">Perfect for one-off tickets</p>
                        </div>
                        <div className="border-2 border-purple-200 rounded-lg p-4">
                          <h4 className="font-medium">Unlimited Annual</h4>
                          <p className="text-2xl font-bold text-purple-600">£9.99/year</p>
                          <p className="text-xs text-gray-500">Best for frequent drivers</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Button 
                        onClick={() => processPayment("single")}
                        disabled={loading}
                        className="w-full"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {loading ? "Processing..." : "Pay £2.99"}
                      </Button>
                      <Button 
                        onClick={() => processPayment("annual")}
                        disabled={loading}
                        variant="outline"
                        className="w-full"
                      >
                        Pay £9.99/year
                      </Button>
                    </div>
                  </div>
                )}

                {paymentStep === "generating" && (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-sm text-gray-600">
                      Generating your personalized appeal letter...
                    </p>
                  </div>
                )}

                {paymentStep === "complete" && (
                  <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 mb-4">
                      Your appeal letter is ready! Copy it or download as PDF.
                    </p>
                    <Button asChild className="w-full">
                      <a href="#" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Submit Appeal
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Case Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Case Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <Car className="h-4 w-4 text-gray-400" />
                    <span>{appealData.confirmedVrm}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{appealData.confirmedLocation}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>{new Date(appealData.confirmedDateTime).toLocaleDateString()}</span>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-gray-500">Key Factors:</p>
                    <div className="mt-2 space-y-1">
                      {appealData.paid && <div className="text-green-600">• Payment made</div>}
                      {appealData.loadingUnloading && <div className="text-green-600">• Loading/unloading</div>}
                      {appealData.blueBadge && <div className="text-green-600">• Blue Badge holder</div>}
                      {!appealData.signageVisible && <div className="text-orange-600">• Signage issues</div>}
                      {appealData.noObservationPeriod && <div className="text-orange-600">• No observation period</div>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Legal Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Legal Protection</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Our AI-generated letters are based on UK parking regulations and best practices for successful appeals. 
                  However, success cannot be guaranteed and depends on the specific circumstances of your case.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}