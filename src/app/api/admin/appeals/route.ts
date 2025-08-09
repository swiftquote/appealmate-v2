import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "20")
    const offset = parseInt(searchParams.get("offset") || "0")
    const status = searchParams.get("status")

    const whereClause: any = {}
    if (status && status !== "all") {
      whereClause.status = status
    }

    const appeals = await db.appeal.findMany({
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        },
        evidence: {
          select: {
            id: true,
            type: true,
            fileName: true,
            createdAt: true
          }
        }
      },
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset
    })

    return NextResponse.json({
      success: true,
      appeals,
      total: await db.appeal.count({ where: whereClause }),
      message: "Admin appeals retrieved successfully"
    })

  } catch (error) {
    console.error("Admin appeals error:", error)
    return NextResponse.json({ 
      error: "Internal server error during admin appeals retrieval",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}