import { NextRequest, NextResponse } from "next/server"

interface AppealData {
  issuerType: string
  contraventionCode: string
  issueDateTime: string
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
}

interface Defence {
  id: string
  name: string
  description: string
  strength: "high" | "medium" | "low"
  category: string
  evidence: string[]
  applicable: boolean
  reasoning: string
}

// Contravention rules database
const contraventionRules: Record<string, {
  category: string
  gracePeriodEligible: boolean
  observationRequired: boolean
  commonDefences: string[]
}> = {
  "01": { category: "restricted_street", gracePeriodEligible: false, observationRequired: true, commonDefences: ["loading", "emergency", "signage"] },
  "02": { category: "restricted_street", gracePeriodEligible: false, observationRequired: true, commonDefences: ["loading", "emergency", "signage"] },
  "06": { category: "pay_display", gracePeriodEligible: true, observationRequired: true, commonDefences: ["payment", "machine_fault", "signage"] },
  "11": { category: "payment_required", gracePeriodEligible: true, observationRequired: true, commonDefences: ["payment", "machine_fault", "grace_period"] },
  "12": { category: "permit_required", gracePeriodEligible: false, observationRequired: true, commonDefences: ["permit", "visitor_permit", "signage"] },
  "16": { category: "permit_required", gracePeriodEligible: false, observationRequired: true, commonDefences: ["permit", "bay_marking", "signage"] },
  "19": { category: "permit_required", gracePeriodEligible: false, observationRequired: true, commonDefences: ["permit", "virtual_permit", "system_error"] },
  "21": { category: "suspended_bay", gracePeriodEligible: false, observationRequired: true, commonDefences: ["suspension_signage", "suspension_notice", "emergency"] },
  "22": { category: "reparking", gracePeriodEligible: false, observationRequired: true, commonDefences: ["different_purpose", "loading", "emergency"] },
  "23": { category: "vehicle_type", gracePeriodEligible: false, observationRequired: true, commonDefences: ["vehicle_classification", "signage", "bay_marking"] },
  "24": { category: "parking_position", gracePeriodEligible: false, observationRequired: true, commonDefences: ["bay_marking", "obstruction", "space_availability"] },
  "25": { category: "loading_restriction", gracePeriodEligible: true, observationRequired: true, commonDefences: ["loading", "observation_period", "signage"] },
  "26": { category: "footway_parking", gracePeriodEligible: false, observationRequired: true, commonDefences: ["marked_bay", "signage", "emergency"] },
  "27": { category: "dropped_footway", gracePeriodEligible: false, observationRequired: true, commonDefences: ["footway_marking", "signage", "emergency"] },
  "30": { category: "overtime_parking", gracePeriodEligible: true, observationRequired: true, commonDefences: ["grace_period", "payment_error", "machine_fault"] },
  "40": { category: "disabled_bay", gracePeriodEligible: false, observationRequired: true, commonDefences: ["blue_badge", "permit_display", "signage"] },
  "47": { category: "bus_stop", gracePeriodEligible: false, observationRequired: true, commonDefences: ["boarded_passengers", "emergency", "signage"] },
  "48": { category: "bus_stop", gracePeriodEligible: false, observationRequired: true, commonDefences: ["boarded_passengers", "emergency", "signage"] },
  "50": { category: "traffic_flow", gracePeriodEligible: false, observationRequired: true, commonDefences: ["emergency", "direction", "signage"] },
  "61": { category: "engine_running", gracePeriodEligible: false, observationRequired: true, commonDefences: ["loading", "passenger_dropoff", "short_period"] },
  "62": { category: "footway_parking", gracePeriodEligible: false, observationRequired: true, commonDefences: ["marked_bay", "signage", "emergency"] },
  "73": { category: "taxi_rank", gracePeriodEligible: false, observationRequired: true, commonDefences: ["taxi_license", "emergency", "signage"] },
  "74": { category: "cycle_lane", gracePeriodEligible: false, observationRequired: true, commonDefences: ["emergency", "signage", "lane_marking"] },
  "80": { category: "cycle_lane", gracePeriodEligible: false, observationRequired: true, commonDefences: ["emergency", "signage", "lane_marking"] },
  "85": { category: "pedestrian_zone", gracePeriodEligible: false, observationRequired: true, commonDefences: ["loading", "permit", "emergency"] },
  "86": { category: "pedestrian_zone", gracePeriodEligible: false, observationRequired: true, commonDefences: ["loading", "permit", "emergency"] },
  "87": { category: "restricted_area", gracePeriodEligible: false, observationRequired: true, commonDefences: ["permit", "signage", "emergency"] },
  "91": { category: "police_bay", gracePeriodEligible: false, observationRequired: true, commonDefences: ["emergency_vehicle", "police_business", "signage"] },
  "93": { category: "vehicle_restriction", gracePeriodEligible: false, observationRequired: true, commonDefences: ["vehicle_type", "signage", "emergency"] },
  "95": { category: "clearway", gracePeriodEligible: false, observationRequired: true, commonDefences: ["emergency", "breakdown", "signage"] },
  "96": { category: "cycle_track", gracePeriodEligible: false, observationRequired: true, commonDefences = ["emergency", "signage", "track_marking"] },
  "97": { category: "red_route", gracePeriodEligible: false, observationRequired: true, commonDefences: ["loading", "emergency", "signage"] },
  "99": { category: "specific_vehicle", gracePeriodEligible: false, observationRequired: true, commonDefences: ["vehicle_type", "permit", "signage"] }
}

// Defence templates
const defenceTemplates: Record<string, Defence> = {
  loading: {
    id: "loading",
    name: "Loading/Unloading Goods",
    description: "You were actively loading or unloading goods from your vehicle",
    strength: "high",
    category: "exemption",
    evidence: ["delivery_notes", "cctv", "witness_statements"],
    applicable: false,
    reasoning: "Loading/unloading is permitted in many restricted areas if done continuously and without unreasonable delay"
  },
  passenger_dropoff: {
    id: "passenger_dropoff",
    name: "Passenger Drop-off/Pick-up",
    description: "You were picking up or dropping off passengers",
    strength: "medium",
    category: "exemption",
    evidence: ["passenger_details", "cctv", "witness_statements"],
    applicable: false,
    reasoning: "Passenger boarding/alighting is often permitted for short periods in restricted areas"
  },
  blue_badge: {
    id: "blue_badge",
    name: "Blue Badge Holder",
    description: "You are a registered Blue Badge holder",
    strength: "high",
    category: "exemption",
    evidence: ["blue_badge", "clock", "permit_display"],
    applicable: false,
    reasoning: "Blue Badge holders have specific parking exemptions that may apply to this contravention"
  },
  medical_emergency: {
    id: "medical_emergency",
    name: "Medical Emergency",
    description: "There was a medical emergency requiring immediate parking",
    strength: "high",
    category: "exemption",
    evidence: ["medical_records", "hospital_letter", "police_report"],
    applicable: false,
    reasoning: "Medical emergencies can justify parking in restricted areas if circumstances were urgent"
  },
  grace_period: {
    id: "grace_period",
    name: "Grace Period",
    description: "You were within the allowed grace period for parking",
    strength: "medium",
    category: "procedural",
    evidence: ["payment_receipt", "timestamp", "cctv"],
    applicable: false,
    reasoning: "Many parking areas have a 10-minute grace period for paid parking and permit holders"
  },
  signage_issues: {
    id: "signage_issues",
    name: "Inadequate or Missing Signage",
    description: "Parking signs were unclear, missing, or obscured",
    strength: "high",
    category: "procedural",
    evidence: ["photos", "location_survey", "witness_statements"],
    applicable: false,
    reasoning: "Traffic signs must be clear, visible, and compliant with regulations to be enforceable"
  },
  bay_marking_issues: {
    id: "bay_marking_issues",
    name: "Faded or Absent Bay Markings",
    description: "Parking bay markings were unclear or missing",
    strength: "medium",
    category: "procedural",
    evidence: ["photos", "highway_inspection", "council_records"],
    applicable: false,
    reasoning: "Bay markings must be clearly visible and well-maintained to be enforceable"
  },
  payment_made: {
    id: "payment_made",
    name: "Payment Made",
    description: "You had paid for parking or had a valid permit",
    strength: "high",
    category: "payment",
    evidence: ["payment_receipt", "bank_statement", "permit"],
    applicable: false,
    reasoning: "Valid payment or permit should prevent penalty charges if properly displayed"
  },
  observation_period: {
    id: "observation_period",
    name: "Insufficient Observation Period",
    description: "CEO did not observe for the required minimum time",
    strength: "medium",
    category: "procedural",
    evidence: ["cctv", "ceo_notes", "timestamp"],
    applicable: false,
    reasoning: "CEOs must observe for the minimum required period based on the contravention type"
  },
  late_council_reply: {
    id: "late_council_reply",
    name: "Late Council Response",
    description: "Council failed to respond within 56 days to previous challenge",
    strength: "high",
    category: "procedural",
    evidence: ["previous_correspondence", "proof_of_posting", "council_records"],
    applicable: false,
    reasoning: "Councils must respond to formal representations within 56 days or the PCN must be cancelled"
  }
}

export async function POST(request: NextRequest) {
  try {
    const appealData: AppealData = await request.json()

    if (!appealData) {
      return NextResponse.json({ error: "No appeal data provided" }, { status: 400 })
    }

    // Get contravention rules
    const contraventionRule = contraventionRules[appealData.contraventionCode] || {
      category: "unknown",
      gracePeriodEligible: false,
      observationRequired: true,
      commonDefences: []
    }

    // Initialize defences
    const defences: Defence[] = JSON.parse(JSON.stringify(Object.values(defenceTemplates)))

    // Apply rules to determine applicable defences
    defences.forEach(defence => {
      defence.applicable = false
      defence.reasoning = ""

      switch (defence.id) {
        case "loading":
          if (appealData.loadingUnloading) {
            defence.applicable = true
            defence.reasoning = "User confirmed they were loading/unloading goods"
            defence.strength = contraventionRule.category.includes("loading") ? "high" : "medium"
          }
          break

        case "passenger_dropoff":
          if (appealData.passengerDropoff) {
            defence.applicable = true
            defence.reasoning = "User confirmed they were picking up/dropping off passengers"
            defence.strength = "medium"
          }
          break

        case "blue_badge":
          if (appealData.blueBadge) {
            defence.applicable = true
            defence.reasoning = "User confirmed they hold a Blue Badge"
            defence.strength = "high"
          }
          break

        case "medical_emergency":
          if (appealData.medicalEmergency) {
            defence.applicable = true
            defence.reasoning = "User confirmed there was a medical emergency"
            defence.strength = "high"
          }
          break

        case "grace_period":
          if (contraventionRule.gracePeriodEligible && appealData.paid && appealData.paidUntil) {
            const issueTime = new Date(appealData.issueDateTime)
            const paidUntilTime = new Date(`1970-01-01T${appealData.paidUntil}:00`)
            const gracePeriodEnd = new Date(paidUntilTime.getTime() + 10 * 60000) // 10 minutes grace
            
            if (issueTime <= gracePeriodEnd) {
              defence.applicable = true
              defence.reasoning = "Vehicle was within 10-minute grace period after paid time expired"
              defence.strength = "high"
            }
          }
          break

        case "signage_issues":
          if (!appealData.signageVisible) {
            defence.applicable = true
            defence.reasoning = "User confirmed signage was not visible or clear"
            defence.strength = "high"
          }
          break

        case "bay_marking_issues":
          if (!appealData.markingsVisible) {
            defence.applicable = true
            defence.reasoning = "User confirmed road markings were not visible or clear"
            defence.strength = "medium"
          }
          break

        case "payment_made":
          if (appealData.paid) {
            defence.applicable = true
            defence.reasoning = "User confirmed they had paid for parking or had a permit"
            defence.strength = "high"
          }
          break

        case "observation_period":
          if (appealData.noObservationPeriod && contraventionRule.observationRequired) {
            defence.applicable = true
            defence.reasoning = "User confirmed no observation period was observed by CEO"
            defence.strength = "medium"
          }
          break

        case "late_council_reply":
          if (appealData.lateCouncilReply) {
            defence.applicable = true
            defence.reasoning = "User confirmed council did not respond within 56 days to previous challenge"
            defence.strength = "high"
          }
          break
      }
    })

    // Filter applicable defences and sort by strength
    const applicableDefences = defences
      .filter(defence => defence.applicable)
      .sort((a, b) => {
        const strengthOrder = { high: 3, medium: 2, low: 1 }
        return strengthOrder[b.strength] - strengthOrder[a.strength]
      })

    // If no applicable defences found, suggest general procedural defences
    if (applicableDefences.length === 0) {
      const generalDefences = [
        "Request CEO notes and photos to verify observation period and signage",
        "Check if the PCN complies with all legal requirements",
        "Verify the location matches the actual parking restrictions",
        "Challenge if the penalty amount exceeds the allowed maximum"
      ]

      return NextResponse.json({
        success: true,
        defences: [],
        primaryDefence: null,
        supportingDefences: [],
        generalDefences,
        message: "No specific defences identified. Consider general procedural challenges."
      })
    }

    // Select primary defence (highest strength)
    const primaryDefence = applicableDefences[0]
    const supportingDefences = applicableDefences.slice(1, 4) // Top 3 supporting defences

    return NextResponse.json({
      success: true,
      defences: applicableDefences,
      primaryDefence,
      supportingDefences,
      contraventionCategory: contraventionRule.category,
      message: "Rules engine analysis completed successfully"
    })

  } catch (error) {
    console.error("Rules engine error:", error)
    return NextResponse.json({ 
      error: "Internal server error during rules analysis",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}