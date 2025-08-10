"use client";
export const dynamic = "force-dynamic";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";

interface OCRData {
  issuerType: string;
  councilOrCompany: string;
  pcnNumber: string;
  vrm: string;
  contraventionCode: string;
  contraventionText: string;
  issueDateTime: string;
  location: string;
  observationStart?: string;
  observationEnd?: string;
  ceoNotes?: string;
  contraventionExplanation: string;
  confidence: Record<string, number>;
}

function AppealProcessInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [ocrData, setOcrData] = useState<OCRData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    confirmedVrm: "",
    confirmedLocation: "",
    confirmedDateTime: "",
    confirmedContravention: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleColour: "",
    paid: false,
    paidUntil: "",
    paymentMethod: "",
    permitType: "",
    loadingUnloading: false,
    passengerDropoff: false,
    blueBadge: false,
    medicalEmergency: false,
    signageVisible: true,
    markingsVisible: true,
    noObservationPeriod: false,
    lateCouncilReply: false,
    additionalNotes: "",
  });

  const steps = [
    "Ticket Details",
    "Vehicle Info",
    "Payment & Permit",
    "Exemptions",
    "Signage & Procedural",
    "Review",
  ];

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    const ocrParam = searchParams.get("ocr");
    if (ocrParam) {
      try {
        const parsedData = JSON.parse(atob(ocrParam));
        setOcrData(parsedData);

        setFormData((prev) => ({
          ...prev,
          confirmedVrm: parsedData.vrm,
          confirmedLocation: parsedData.location,
          confirmedDateTime: parsedData.issueDateTime,
          confirmedContravention: `${parsedData.contraventionCode} - ${parsedData.contraventionText}`,
        }));
      } catch {
        setError("Invalid OCR data provided");
      }
    } else {
      const uploadedFile = sessionStorage.getItem("uploadedFile");
      if (!uploadedFile) {
        router.push("/");
        return;
      }
    }
  }, [status, router, searchParams]);

  const submitAppeal = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ocrData, formData, userId: session?.user?.email }),
      });
      if (!response.ok) throw new Error("Failed to create appeal");
      const result = await response.json();
      router.push(`/appeal/${result.appealId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit appeal");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || !ocrData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-xl font-semibold">Appeal Process</h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
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

        {/* Step Content Placeholder */}
      </div>
    </div>
  );
}

export default function AppealProcess() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
        </div>
      }
    >
      <AppealProcessInner />
    </Suspense>
  );
}
