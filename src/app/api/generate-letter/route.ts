import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Ensure you have OPENAI_API_KEY in your environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AppealLetterRequest {
  appealData: {
    id: string;
    issuerType: string; // "council" | "private"
    councilOrCompany: string;
    pcnNumber: string;
    vrm: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleColour?: string;
    contraventionCode: string;
    contraventionText: string;
    issueDateTime: string; // ISO
    location: string;
    confirmedVrm: string;
    confirmedLocation: string;
    confirmedDateTime: string;
    confirmedContravention: string;
    paid: boolean;
    paidUntil?: string; // ISO
    paymentMethod?: string; // RingGo, PayByPhone, etc.
    permitType?: string;

    loadingUnloading: boolean;
    passengerDropoff: boolean;
    blueBadge: boolean;
    medicalEmergency: boolean;

    signageVisible: boolean;   // true if signage WAS visible/clear
    markingsVisible: boolean;  // true if markings WERE visible/clear

    noObservationPeriod: boolean;
    lateCouncilReply: boolean;
    additionalNotes?: string;
  };
  rulesAnalysis: {
    primaryDefence: {
      id: string;
      name: string;
      description: string;
      strength: string; // e.g., "High" | "Medium" | "Low"
      category: string;
      reasoning: string;
    };
    supportingDefences: Array<{
      id: string;
      name: string;
      description: string;
      strength: string;
      category: string;
      reasoning: string;
    }>;
    contraventionCategory: string;
  };
}

function safeJoin(arr?: string[] | null, sep = ", "): string {
  return Array.isArray(arr) ? arr.filter(Boolean).join(sep) : "";
}

function boolFlag(v: boolean): string {
  return v ? "Yes" : "No";
}

export async function POST(request: NextRequest) {
  try {
    const { appealData, rulesAnalysis }: AppealLetterRequest = await request.json();

    if (!appealData || !rulesAnalysis) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 });
    }

    // ----------------------------
    // 1) ANALYSIS STEP
    // ----------------------------
    const analysisMessages = [
      {
        role: "system" as const,
        content: `You are a UK parking appeals specialist with deep knowledge of parking regulations, the Traffic Management Act 2004, the Civil Enforcement of Parking Contraventions regulations, POFA 2012, and BPA/IPC codes of practice.
Your task is to analyse the provided appeal case and determine the strongest legal, procedural, or mitigating arguments. Never invent facts. Be realistic about success chances.

If the driver is technically liable, still identify any mitigating reasons that may persuade the issuer to exercise discretion.

Reference these common defences/mitigations (select only those supported by the facts/evidence):
| Excuse/Mitigating Reason            | When It’s Used (PCN Type)                                                   | Supporting Evidence & Notes |
| ----------------------------------- | --------------------------------------------------------------------------- | --------------------------- |
| Unclear or Missing Signage          | Parking, Bus Lane, Moving Traffic – if signs/markings not visible/compliant | Photos of missing/obscured signs, faded lines; strong for cancellation |
| Medical Emergency                   | Any – sudden illness/injury (driver/passenger)                              | Doctor/ambulance note; genuine urgency → often cancelled |
| Vehicle Breakdown                   | Any – vehicle incapacitated                                                  | Recovery/mechanic report, dated receipts |
| Paid but Ticket Not Displayed       | Parking – paid/permit valid but not shown                                    | Copy of valid ticket/permit, app receipt; commonly cancelled first offence |
| Typos/Payment Errors                | Parking/Congestion – wrong VRM or similar minor entry error                  | Payment/app record showing intent to pay |
| Temporary Restriction Not Known     | Parking/Moving – bay suspension/new restriction poorly communicated          | Proof of timing/placement of signs; fairness/discretion argument |
| Dropping Off / Loading              | Parking – brief stop in permitted circumstances                              | Delivery note, timing explanation; often an exemption |
| First-Time Honest Mistake           | Any – general plea for leniency                                              | Polite admission + clean history (if known) |
| Procedural/Legal Error by Authority | Any – PCN/NTO errors, late service, wrong process                            | Cite exact flaw; can be fatal to PCN validity

Return STRICT JSON (no markdown) with this schema:
{
  "caseAssessment": "Brief overall assessment",
  "keyLegalPoints": ["Point 1", "Point 2"],
  "evidenceRecommendations": ["Evidence 1", "Evidence 2"],
  "successLikelihood": "high" | "medium" | "low",
  "mitigatingReasons": ["Reason 1", "Reason 2"],
  "additionalAdvice": "Short strategic tip"
}`,
      },
      {
        role: "user" as const,
        content: `
APPEAL DETAILS:
PCN: ${appealData.pcnNumber}
Issuer: ${appealData.councilOrCompany} (${appealData.issuerType})
Vehicle: ${appealData.confirmedVrm} (${appealData.vehicleMake || "Unknown make"} ${appealData.vehicleModel || "Unknown model"}, ${appealData.vehicleColour || "Unknown colour"})
Contravention: ${appealData.contraventionCode} - ${appealData.contraventionText}
Date & Time: ${appealData.confirmedDateTime}
Location: ${appealData.confirmedLocation}

PRIMARY DEFENCE: ${rulesAnalysis.primaryDefence.name} — ${rulesAnalysis.primaryDefence.reasoning}
SUPPORTING DEFENCES: ${rulesAnalysis.supportingDefences.map((d) => d.name).join(", ")}

KEY FACTORS:
Payment made: ${appealData.paid ? `Yes (until ${appealData.paidUntil})` : "No"}
Payment method: ${appealData.paymentMethod || "Unknown"}
Permit type: ${appealData.permitType || "None"}
Loading/unloading: ${boolFlag(appealData.loadingUnloading)}
Passenger drop-off: ${boolFlag(appealData.passengerDropoff)}
Blue Badge holder: ${boolFlag(appealData.blueBadge)}
Medical emergency: ${boolFlag(appealData.medicalEmergency)}
Signage visible/clear: ${boolFlag(appealData.signageVisible)}
Markings visible/clear: ${boolFlag(appealData.markingsVisible)}
No observation period: ${boolFlag(appealData.noObservationPeriod)}
Late council reply (56 days+): ${boolFlag(appealData.lateCouncilReply)}
Additional notes: ${appealData.additionalNotes || "None"}

Please analyse and return STRICT JSON only.`,
      },
    ];

    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-5",
      messages: analysisMessages,
      temperature: 0.25, // keep analysis steady
      max_tokens: 900,
    });

    const analysisRaw = analysisResponse.choices[0]?.message?.content || "";
    let analysis: {
      caseAssessment: string;
      keyLegalPoints: string[];
      evidenceRecommendations: string[];
      successLikelihood: "high" | "medium" | "low";
      mitigatingReasons: string[];
      additionalAdvice: string;
    };

    try {
      // Try strict JSON parse; if the model returns extra text, fallback to regex extraction
      analysis = JSON.parse(analysisRaw);
    } catch {
      const jsonMatch = analysisRaw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in AI analysis.");
      analysis = JSON.parse(jsonMatch[0]);
    }

    // ----------------------------
    // 2) LETTER GENERATION STEP
    // ----------------------------
    const isWeakCase = analysis.successLikelihood === "low";

    const letterSystem = [
      "You are a professional UK parking appeal letter writer.",
      "Create a persuasive, human-like yet formal letter using UK spelling.",
      "Use only confirmed facts; never invent details.",
      "Balance empathy with accurate legal/procedural points.",
      "Keep it respectful, clear, and concise."
    ].join(" ");

    const mitigationNote = isWeakCase
      ? "This case appears legally weak. Acknowledge the contravention where appropriate and focus on fair, compassionate mitigating circumstances. Request discretion/leniency without sounding entitled."
      : "Focus on the strongest legal/procedural grounds first; include mitigations only if they meaningfully support the case.";

    const letterRequirements =
      `Letter requirements:
- 330–480 words (concise but complete)
- Structure: reference, date, intro, main argument(s), conclusion, signature
- Clearly request cancellation (or discretion if weak)
- If relevant, cite grace period rules/statutory guidance or applicable codes
- Plain English, professional tone`;

    const letterFactsBlock = [
      `PCN: ${appealData.pcnNumber}`,
      `Issuer: ${appealData.councilOrCompany} (${appealData.issuerType})`,
      `Vehicle: ${appealData.confirmedVrm}`,
      `Contravention: ${appealData.contraventionCode} - ${appealData.contraventionText}`,
      `Date & Time: ${appealData.confirmedDateTime}`,
      `Location: ${appealData.confirmedLocation}`,
    ].join("\n");

    const letterKeyFactors = [
      appealData.paid ? `- Payment made until ${appealData.paidUntil}${appealData.paymentMethod ? ` via ${appealData.paymentMethod}` : ""}` : "",
      appealData.permitType ? `- Permit: ${appealData.permitType}` : "",
      appealData.loadingUnloading ? "- Vehicle in active loading/unloading" : "",
      appealData.passengerDropoff ? "- Passenger drop-off" : "",
      appealData.blueBadge ? "- Valid Blue Badge holder" : "",
      appealData.medicalEmergency ? "- Medical emergency at the time" : "",
      !appealData.signageVisible ? "- Signage unclear/not visible" : "",
      !appealData.markingsVisible ? "- Road markings unclear" : "",
      appealData.noObservationPeriod ? "- No observation period provided" : "",
      appealData.lateCouncilReply ? "- Council reply exceeded time limit" : "",
      appealData.additionalNotes ? `- Additional info: ${appealData.additionalNotes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const letterMessages = [
      {
        role: "system" as const,
        content: `${letterSystem}`,
      },
      {
        role: "user" as const,
        content: [
          `Draft an appeal letter based on these facts and analysis:`,
          ``,
          letterFactsBlock,
          ``,
          `CASE ANALYSIS:`,
          `Assessment: ${analysis.caseAssessment}`,
          `Success Likelihood: ${analysis.successLikelihood}`,
          `Key Legal/Procedural Points: ${safeJoin(analysis.keyLegalPoints)}`,
          `Evidence Recommended: ${safeJoin(analysis.evidenceRecommendations)}`,
          `Mitigating Reasons: ${safeJoin(analysis.mitigatingReasons)}`,
          ``,
          `PRIMARY DEFENCE: ${rulesAnalysis.primaryDefence.name} — ${rulesAnalysis.primaryDefence.reasoning}`,
          `SUPPORTING DEFENCES: ${rulesAnalysis.supportingDefences.map((d) => `${d.name}: ${d.description}`).join("; ") || "None"}`,
          ``,
          `KEY FACTORS TO INCLUDE:`,
          letterKeyFactors || "- (no additional factors)",
          ``,
          mitigationNote,
          ``,
          letterRequirements,
        ].join("\n"),
      },
    ];

    const letterResponse = await openai.chat.completions.create({
      model: "gpt-5",
      messages: letterMessages,
      temperature: isWeakCase ? 0.35 : 0.4, // slightly steadier if weak case
      max_tokens: 850,
    });

    const letterContent = letterResponse.choices[0]?.message?.content?.trim() || "";

    return NextResponse.json({
      success: true,
      letter: letterContent,
      analysis,
      primaryDefence: rulesAnalysis.primaryDefence,
      supportingDefences: rulesAnalysis.supportingDefences,
      evidenceRecommendations: analysis.evidenceRecommendations,
      mitigatingReasons: analysis.mitigatingReasons,
      successLikelihood: analysis.successLikelihood,
      message: "Appeal letter generated successfully",
    });
  } catch (error: any) {
    console.error("Letter generation error:", error);
    return NextResponse.json(
      {
        error: "Internal server error during letter generation",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
