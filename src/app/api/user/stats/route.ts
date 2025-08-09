import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Get user data
    const user = await db.user.findUnique({
      where: { email: userId }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get user's appeals
    const appeals = await db.appeal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    })

    // Calculate stats
    const totalAppeals = appeals.length
    const successfulAppeals = appeals.filter(appeal => appeal.status === "completed").length
    const pendingAppeals = appeals.filter(appeal => appeal.status === "paid" || appeal.status === "draft").length

    const stats = {
      totalAppeals,
      successfulAppeals,
      pendingAppeals,
      planType: user.planType,
      planExpiry: user.planExpiry?.toISOString(),
      appealsUsed: user.appealsUsed
    }

    return NextResponse.json({
      success: true,
      stats,
      message: "User stats retrieved successfully"
    })

  } catch (error) {
    console.error("User stats error:", error)
    return NextResponse.json({ 
      error: "Internal server error during user stats retrieval",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}