import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { ocrData, formData, userId } = await request.json()

    if (!ocrData || !formData || !userId) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 })
    }

    // Create appeal in database
    const appeal = await db.appeal.create({
      data: {
        userId: userId,
        issuerType: ocrData.issuerType,
        councilOrCompany: ocrData.councilOrCompany,
        pcnNumber: ocrData.pcnNumber,
        vrm: ocrData.vrm,
        vehicleMake: formData.vehicleMake || null,
        vehicleModel: formData.vehicleModel || null,
        vehicleColour: formData.vehicleColour || null,
        contraventionCode: ocrData.contraventionCode,
        contraventionText: ocrData.contraventionText,
        issueDateTime: new Date(ocrData.issueDateTime),
        location: ocrData.location,
        observationStart: ocrData.observationStart ? new Date(ocrData.observationStart) : null,
        observationEnd: ocrData.observationEnd ? new Date(ocrData.observationEnd) : null,
        ceoNotes: ocrData.ceoNotes || null,
        
        // User confirmed details
        confirmedVrm: formData.confirmedVrm,
        confirmedLocation: formData.confirmedLocation,
        confirmedDateTime: new Date(formData.confirmedDateTime),
        confirmedContravention: formData.confirmedContravention,
        
        // Payment and permit info
        paid: formData.paid,
        paidUntil: formData.paidUntil ? new Date(`1970-01-01T${formData.paidUntil}:00`) : null,
        paymentMethod: formData.paymentMethod || null,
        permitType: formData.permitType || null,
        
        // Exemptions
        loadingUnloading: formData.loadingUnloading,
        passengerDropoff: formData.passengerDropoff,
        blueBadge: formData.blueBadge,
        medicalEmergency: formData.medicalEmergency,
        
        // Signage and procedural
        signageVisible: formData.signageVisible,
        markingsVisible: formData.markingsVisible,
        noObservationPeriod: formData.noObservationPeriod,
        lateCouncilReply: formData.lateCouncilReply,
        
        status: "draft"
      }
    })

    return NextResponse.json({
      success: true,
      appealId: appeal.id,
      message: "Appeal created successfully"
    })

  } catch (error) {
    console.error("Appeal creation error:", error)
    return NextResponse.json({ 
      error: "Internal server error during appeal creation",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    const appeals = await db.appeal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({
      success: true,
      appeals,
      message: "Appeals retrieved successfully"
    })

  } catch (error) {
    console.error("Appeals retrieval error:", error)
    return NextResponse.json({ 
      error: "Internal server error during appeals retrieval",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}