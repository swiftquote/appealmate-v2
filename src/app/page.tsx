"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Camera, FileText, Shield, Zap } from "lucide-react"
import Image from "next/image"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    if (file.type.startsWith("image/")) {
      setUploadedFile(file)
    } else {
      alert("Please upload an image file")
    }
  }

  const startAppealProcess = async () => {
    if (!session) {
      signIn()
      return
    }

    if (!uploadedFile) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // First, upload the file
      const uploadFormData = new FormData()
      uploadFormData.append("file", uploadedFile)
      uploadFormData.append("type", "ticket")

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file")
      }

      const uploadResult = await uploadResponse.json()

      // Then, process OCR
      const ocrFormData = new FormData()
      ocrFormData.append("image", uploadedFile)

      const ocrResponse = await fetch("/api/ocr", {
        method: "POST",
        body: ocrFormData,
      })

      if (!ocrResponse.ok) {
        throw new Error("Failed to process OCR")
      }

      const ocrResult = await ocrResponse.json()

      if (!ocrResult.success) {
        throw new Error(ocrResult.error || "OCR processing failed")
      }

      // Store OCR data in session storage and redirect
      const ocrDataEncoded = btoa(JSON.stringify(ocrResult.data))
      sessionStorage.setItem("uploadedFile", uploadedFile.name)
      
      // Redirect to appeal process with OCR data
      router.push(`/appeal?ocr=${encodeURIComponent(ocrDataEncoded)}`)

    } catch (error) {
      console.error("Appeal process error:", error)
      setError(error instanceof Error ? error.message : "Failed to start appeal process")
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Shield className="h-8 w-8 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">AppealMate v2</h1>
        </div>
        {session ? (
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => router.push("/dashboard")}>
              Dashboard
            </Button>
            <span className="text-sm text-gray-600">Welcome, {session.user?.name}</span>
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              Sign Out
            </Button>
          </div>
        ) : (
          <Button onClick={() => signIn()}>Sign In</Button>
        )}
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Beat UK Parking Tickets with AI
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Upload your PCN or parking ticket, answer a few simple questions, and let our AI generate the perfect appeal letter.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">AI-Powered</span>
            </div>
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm">
              <FileText className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Legal Defence</span>
            </div>
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm">
              <Shield className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Success Focused</span>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Upload Your Parking Ticket</CardTitle>
            <CardDescription className="text-center">
              Take a photo or upload an image of your PCN or parking notice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {uploadedFile ? (
                <div className="space-y-4">
                  <div className="relative w-32 h-32 mx-auto">
                    <Image
                      src={URL.createObjectURL(uploadedFile)}
                      alt="Uploaded ticket"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <p className="text-sm text-gray-600">{uploadedFile.name}</p>
                  <Button onClick={() => setUploadedFile(null)} variant="outline" size="sm">
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      Drop your ticket image here
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      or click to browse files
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button asChild>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleFileInput}
                        />
                        <Camera className="mr-2 h-4 w-4" />
                        Take Photo
                      </label>
                    </Button>
                    <Button variant="outline" asChild>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileInput}
                        />
                        <Upload className="mr-2 h-4 w-4" />
                        Upload File
                      </label>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action Button */}
        <div className="text-center">
          <Button
            size="lg"
            className="w-full sm:w-auto px-8 py-3 text-lg"
            disabled={!uploadedFile || loading}
            onClick={startAppealProcess}
          >
            {loading ? "Processing..." : (session ? "Start Your Appeal" : "Sign In to Start Appeal")}
          </Button>
          {!uploadedFile && (
            <p className="text-sm text-gray-500 mt-2">
              Please upload a ticket image to continue
            </p>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-blue-600" />
                <span>Smart OCR</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Our AI extracts all ticket details automatically - issuer, PCN number, location, dates, and contravention codes.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-green-600" />
                <span>Legal Defence</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Built-in rules engine identifies the strongest defences based on UK parking regulations and your specific circumstances.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-purple-600" />
                <span>AI Letters</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                GPT-4 generates professional, persuasive appeal letters tailored to your case, ready to send to councils or private companies.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Pricing */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">Simple, Transparent Pricing</h3>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <CardTitle>Single Appeal</CardTitle>
                <CardDescription>Perfect for one-off tickets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 mb-4">£2.99</div>
                <ul className="text-sm text-gray-600 space-y-2 text-left">
                  <li>• Full OCR analysis</li>
                  <li>• Smart defence selection</li>
                  <li>• AI-generated appeal letter</li>
                  <li>• PDF download</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200">
              <CardHeader>
                <CardTitle>Unlimited Annual</CardTitle>
                <CardDescription>Best for frequent drivers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600 mb-4">£9.99/year</div>
                <ul className="text-sm text-gray-600 space-y-2 text-left">
                  <li>• Everything in Single</li>
                  <li>• Unlimited appeals</li>
                  <li>• Appeal history</li>
                  <li>• Priority processing</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">
            © 2024 AppealMate v2. Helping UK drivers beat unfair parking tickets.
          </p>
        </div>
      </footer>
    </div>
  )
}