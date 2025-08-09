import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")

    const users = await db.user.findMany({
      include: {
        appeals: {
          select: {
            id: true,
            status: true,
            createdAt: true
          }
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset
    })

    // Format user data for response
    const formattedUsers = users.map(user => ({
      ...user,
      appealsUsed: user.appeals.length,
      totalPayments: user.payments.length,
      successfulPayments: user.payments.filter(p => p.status === "completed").length
    }))

    return NextResponse.json({
      success: true,
      users: formattedUsers,
      total: await db.user.count(),
      message: "Admin users retrieved successfully"
    })

  } catch (error) {
    console.error("Admin users error:", error)
    return NextResponse.json({ 
      error: "Internal server error during admin users retrieval",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}