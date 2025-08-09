"use client"

import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, CheckCircle, AlertTriangle, Upload, Clock, MapPin, Car, FileText } from "lucide-react"

interface OCRData {
  issuerType: string
  councilOrCompany: string
  pcnNumber: string
  vrm: string
  contraventionCode: string
  contraventionText: string
  issueDateTime: string
  location: string
  observationStart?: string
  observationEnd?: string
  ceoNotes?: string
  contraventionExplanation: string
  confidence: Record<string, number>
}

export default function AppealProcess() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(1)
  const [ocrData, setOcrData] = useState<OCRData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    // Confirmed details
    confirmedVrm: "",
    confirmedLocation: "",
    confirmedDateTime: "",
    confirmedContravention: "",
    
    // Vehicle details
    vehicleMake: "",
    vehicleModel: "",
    vehicleColour: "",
    
    // Payment info
    paid: false,
    paidUntil: "",
    paymentMethod: "",
    permitType: "",
    
    // Exemptions
    loadingUnloading: false,
    passengerDropoff: false,
    blueBadge: false,
    medicalEmergency: false,
    
    // Signage and procedural
    signageVisible: true,
    markingsVisible: true,
    noObservationPeriod: false,
    lateCouncilReply: false,
    
    // Additional notes
    additionalNotes: ""
  })

  const steps = [
    "Ticket Details",
    "Vehicle Info", 
    "Payment & Permit",
    "Exemptions",
    "Signage & Procedural",
    "Review"
  ]

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
      return
    }

    // Get OCR data from URL params or session storage
    const ocrParam = searchParams.get("ocr")
    if (ocrParam) {
      try {
        const parsedData = JSON.parse(atob(ocrParam))
        setOcrData(parsedData)
        
        // Pre-fill form with OCR data
        setFormData(prev => ({
          ...prev,
          confirmedVrm: parsedData.vrm,
          confirmedLocation: parsedData.location,
          confirmedDateTime: parsedData.issueDateTime,
          confirmedContravention: `${parsedData.contraventionCode} - ${parsedData.contraventionText}`
        }))
      } catch (error) {
        setError("Invalid OCR data provided")
      }
    } else {
      // Check session storage for uploaded file
      const uploadedFile = sessionStorage.getItem("uploadedFile")
      if (!uploadedFile) {
        router.push("/")
        return
      }
    }
  }, [status, router, searchParams])

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600"
    if (confidence >= 0.6) return "text-yellow-600"
    return "text-red-600"
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="h-4 w-4" />
    return <AlertTriangle className="h-4 w-4" />
  }

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const submitAppeal = async () => {
    setLoading(true)
    setError(null)

    try {
      // Create appeal in database
      const response = await fetch("/api/appeals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ocrData,
          formData,
          userId: session?.user?.email
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create appeal")
      }

      const result = await response.json()
      
      // Redirect to payment or appeal details
      router.push(`/appeal/${result.appealId}`)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to submit appeal")
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading" || !ocrData) {
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
            <h1 className="text-xl font-semibold">Appeal Process</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">
              Step {currentStep} of {steps.length}
            </span>
            <Badge variant="outline">{steps[currentStep - 1]}</Badge>
          </div>
          <Progress value={(currentStep / steps.length) * 100} className="h-2" />
        </div>

        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep - 1]}</CardTitle>
            <CardDescription>
              {currentStep === 1 && "Please confirm the details extracted from your ticket"}
              {currentStep === 2 && "Tell us about your vehicle"}
              {currentStep === 3 && "Payment and permit information"}
              {currentStep === 4 && "Any exemptions that may apply to your case"}
              {currentStep === 5 && "Signage, markings, and procedural details"}
              {currentStep === 6 && "Review your information before submitting"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Ticket Details */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vrm">Vehicle Registration</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input
                        id="vrm"
                        value={formData.confirmedVrm}
                        onChange={(e) => handleInputChange("confirmedVrm", e.target.value)}
                        placeholder="Enter vehicle registration"
                      />
                      <div className={getConfidenceColor(ocrData.confidence.vrm)}>
                        {getConfidenceIcon(ocrData.confidence.vrm)}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      OCR detected: {ocrData.vrm}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="location">Location</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input
                        id="location"
                        value={formData.confirmedLocation}
                        onChange={(e) => handleInputChange("confirmedLocation", e.target.value)}
                        placeholder="Enter location"
                      />
                      <div className={getConfidenceColor(ocrData.confidence.location)}>
                        {getConfidenceIcon(ocrData.confidence.location)}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      OCR detected: {ocrData.location}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="dateTime">Date & Time</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input
                        id="dateTime"
                        type="datetime-local"
                        value={formData.confirmedDateTime}
                        onChange={(e) => handleInputChange("confirmedDateTime", e.target.value)}
                      />
                      <div className={getConfidenceColor(ocrData.confidence.issueDateTime)}>
                        {getConfidenceIcon(ocrData.confidence.issueDateTime)}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      OCR detected: {ocrData.issueDateTime}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="contravention">Contravention</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input
                        id="contravention"
                        value={formData.confirmedContravention}
                        onChange={(e) => handleInputChange("confirmedContravention", e.target.value)}
                        placeholder="Contravention details"
                      />
                      <div className={getConfidenceColor(ocrData.confidence.contraventionCode)}>
                        {getConfidenceIcon(ocrData.confidence.contraventionCode)}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {ocrData.contraventionExplanation}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Ticket Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Car className="h-4 w-4 text-blue-600" />
                      <span><strong>Issuer:</strong> {ocrData.councilOrCompany}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span><strong>PCN:</strong> {ocrData.pcnNumber}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span><strong>Type:</strong> {ocrData.issuerType}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      <span><strong>Code:</strong> {ocrData.contraventionCode}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Vehicle Information */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="make">Vehicle Make</Label>
                    <Input
                      id="make"
                      value={formData.vehicleMake}
                      onChange={(e) => handleInputChange("vehicleMake", e.target.value)}
                      placeholder="e.g., Ford, BMW, Toyota"
                    />
                  </div>

                  <div>
                    <Label htmlFor="model">Vehicle Model</Label>
                    <Input
                      id="model"
                      value={formData.vehicleModel}
                      onChange={(e) => handleInputChange("vehicleModel", e.target.value)}
                      placeholder="e.g., Focus, 3 Series, Yaris"
                    />
                  </div>

                  <div>
                    <Label htmlFor="colour">Vehicle Colour</Label>
                    <Input
                      id="colour"
                      value={formData.vehicleColour}
                      onChange={(e) => handleInputChange("vehicleColour", e.target.value)}
                      placeholder="e.g., Blue, Red, Silver"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">
                    Vehicle information helps us verify your identity and strengthen your appeal case. 
                    This information is kept secure and only used for your appeal.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Payment & Permit */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="paid"
                    checked={formData.paid}
                    onCheckedChange={(checked) => handleInputChange("paid", checked as boolean)}
                  />
                  <Label htmlFor="paid">Did you pay for parking or have a permit?</Label>
                </div>

                {formData.paid && (
                  <div className="space-y-4 pl-6 border-l-2 border-blue-200">
                    <div>
                      <Label htmlFor="paymentMethod">How did you pay?</Label>
                      <Select value={formData.paymentMethod} onValueChange={(value) => handleInputChange("paymentMethod", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RingGo">RingGo</SelectItem>
                          <SelectItem value="PayByPhone">PayByPhone</SelectItem>
                          <SelectItem value="JustPark">JustPark</SelectItem>
                          <SelectItem value="Machine">Pay & Display Machine</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="paidUntil">Until what time was it valid?</Label>
                      <Input
                        id="paidUntil"
                        type="time"
                        value={formData.paidUntil}
                        onChange={(e) => handleInputChange("paidUntil", e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="permitType">What type of permit?</Label>
                      <Select value={formData.permitType} onValueChange={(value) => handleInputChange("permitType", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select permit type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Resident">Resident Permit</SelectItem>
                          <SelectItem value="Business">Business Permit</SelectItem>
                          <SelectItem value="Visitor">Visitor Permit</SelectItem>
                          <SelectItem value="BlueBadge">Blue Badge</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="receipt">Upload receipt (optional)</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Click to upload receipt</p>
                        <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Exemptions */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="loading"
                      checked={formData.loadingUnloading}
                      onCheckedChange={(checked) => handleInputChange("loadingUnloading", checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="loading" className="font-medium">Loading or unloading goods</Label>
                      <p className="text-sm text-gray-600">
                        You were actively loading or unloading heavy goods from your vehicle
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="passenger"
                      checked={formData.passengerDropoff}
                      onCheckedChange={(checked) => handleInputChange("passengerDropoff", checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="passenger" className="font-medium">Picking up or dropping off passengers</Label>
                      <p className="text-sm text-gray-600">
                        You were in the process of picking up or dropping off passengers
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="blueBadge"
                      checked={formData.blueBadge}
                      onCheckedChange={(checked) => handleInputChange("blueBadge", checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="blueBadge" className="font-medium">Blue Badge or mobility exemption</Label>
                      <p className="text-sm text-gray-600">
                        You hold a valid Blue Badge or have a mobility exemption
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="medical"
                      checked={formData.medicalEmergency}
                      onCheckedChange={(checked) => handleInputChange("medicalEmergency", checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="medical" className="font-medium">Medical emergency or breakdown</Label>
                      <p className="text-sm text-gray-600">
                        There was a medical emergency or vehicle breakdown
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> You may need to provide evidence for any exemptions claimed. 
                    Have relevant documents ready if available.
                  </p>
                </div>
              </div>
            )}

            {/* Step 5: Signage & Procedural */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="signage"
                      checked={formData.signageVisible}
                      onCheckedChange={(checked) => handleInputChange("signageVisible", checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="signage" className="font-medium">Signage was visible and clear</Label>
                      <p className="text-sm text-gray-600">
                        The parking signs were clearly visible and easy to understand
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="markings"
                      checked={formData.markingsVisible}
                      onCheckedChange={(checked) => handleInputChange("markingsVisible", checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="markings" className="font-medium">Road markings were visible and clear</Label>
                      <p className="text-sm text-gray-600">
                        The road markings (bay lines, etc.) were clearly visible
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="observation"
                      checked={formData.noObservationPeriod}
                      onCheckedChange={(checked) => handleInputChange("noObservationPeriod", checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="observation" className="font-medium">No observation period</Label>
                      <p className="text-sm text-gray-600">
                        The ticket appeared to be issued instantly with no observation period
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="reply"
                      checked={formData.lateCouncilReply}
                      onCheckedChange={(checked) => handleInputChange("lateCouncilReply", checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="reply" className="font-medium">Late council reply</Label>
                      <p className="text-sm text-gray-600">
                        You previously challenged this PCN and didn't receive a reply within 56 days
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Additional notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.additionalNotes}
                    onChange={(e) => handleInputChange("additionalNotes", e.target.value)}
                    placeholder="Any additional information that might help your appeal..."
                    rows={4}
                  />
                </div>
              </div>
            )}

            {/* Step 6: Review */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">Ticket Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div><strong>PCN Number:</strong> {ocrData.pcnNumber}</div>
                    <div><strong>Vehicle:</strong> {formData.confirmedVrm}</div>
                    <div><strong>Location:</strong> {formData.confirmedLocation}</div>
                    <div><strong>Date/Time:</strong> {formData.confirmedDateTime}</div>
                    <div><strong>Issuer:</strong> {ocrData.councilOrCompany}</div>
                    <div><strong>Contravention:</strong> {ocrData.contraventionCode}</div>
                  </div>
                </div>

                {formData.vehicleMake && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">Vehicle Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div><strong>Make:</strong> {formData.vehicleMake}</div>
                      <div><strong>Model:</strong> {formData.vehicleModel}</div>
                      <div><strong>Colour:</strong> {formData.vehicleColour}</div>
                    </div>
                  </div>
                )}

                {formData.paid && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">Payment Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div><strong>Method:</strong> {formData.paymentMethod}</div>
                      <div><strong>Valid Until:</strong> {formData.paidUntil}</div>
                      <div><strong>Permit:</strong> {formData.permitType}</div>
                    </div>
                  </div>
                )}

                {(formData.loadingUnloading || formData.passengerDropoff || formData.blueBadge || formData.medicalEmergency) && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">Claimed Exemptions</h4>
                    <div className="space-y-1 text-sm">
                      {formData.loadingUnloading && <div>• Loading or unloading goods</div>}
                      {formData.passengerDropoff && <div>• Picking up or dropping off passengers</div>}
                      {formData.blueBadge && <div>• Blue Badge or mobility exemption</div>}
                      {formData.medicalEmergency && <div>• Medical emergency or breakdown</div>}
                    </div>
                  </div>
                )}

                {formData.additionalNotes && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-3">Additional Notes</h4>
                    <p className="text-sm">{formData.additionalNotes}</p>
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Next Steps</h4>
                  <p className="text-sm text-blue-800">
                    After submitting, our AI will analyze your case and generate a personalized appeal letter. 
                    You'll then be directed to payment to unlock your appeal letter.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              {currentStep < steps.length ? (
                <Button onClick={nextStep}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={submitAppeal} disabled={loading}>
                  {loading ? "Submitting..." : "Submit Appeal"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}