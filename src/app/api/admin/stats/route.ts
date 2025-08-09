import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // Get total users
    const totalUsers = await db.user.count()

    // Get total appeals
    const totalAppeals = await db.appeal.count()

    // Get total revenue from payments
    const payments = await db.payment.findMany({
      where: { status: "completed" }
    })
    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0)

    // Get successful appeals (completed status)
    const successfulAppeals = await db.appeal.count({
      where: { status: "completed" }
    })

    // Get pending appeals (draft or paid status)
    const pendingAppeals = await db.appeal.count({
      where: { 
        status: { in: ["draft", "paid"] }
      }
    })

    // Get recent users (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recentUsers = await db.user.count({
      where: { 
        createdAt: { gte: sevenDaysAgo }
      }
    })

    // Get active subscriptions
    const activeSubscriptions = await db.user.count({
      where: { 
        planType: "subscriber",
        planExpiry: { gte: new Date() }
      }
    })

    // Calculate OCR accuracy (mock data - in real implementation, this would track OCR success rate)
    const ocrAccuracy = 0.87 // 87% accuracy

    const stats = {
      totalUsers,
      totalAppeals,
      totalRevenue,
      successfulAppeals,
      pendingAppeals,
      recentUsers,
      activeSubscriptions,
      ocrAccuracy
    }

    return NextResponse.json({
      success: true,
      stats,
      message: "Admin stats retrieved successfully"
    })

  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json({ 
      error: "Internal server error during admin stats retrieval",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}