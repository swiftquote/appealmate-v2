import { NextRequest, NextResponse } from "next/server"
import ZAI from "z-ai-web-dev-sdk"

interface AppealLetterRequest {
  appealData: {
    id: string
    issuerType: string
    councilOrCompany: string
    pcnNumber: string
    vrm: string
    vehicleMake?: string
    vehicleModel?: string
    vehicleColour?: string
    contraventionCode: string
    contraventionText: string
    issueDateTime: string
    location: string
    confirmedVrm: string
    confirmedLocation: string
    confirmedDateTime: string
    confirmedContravention: string
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
    additionalNotes?: string
  }
  rulesAnalysis: {
    primaryDefence: {
      id: string
      name: string
      description: string
      strength: string
      category: string
      reasoning: string
    }
    supportingDefences: Array<{
      id: string
      name: string
      description: string
      strength: string
      category: string
      reasoning: string
    }>
    contraventionCategory: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const { appealData, rulesAnalysis }: AppealLetterRequest = await request.json()

    if (!appealData || !rulesAnalysis) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 })
    }

    // Initialize ZAI SDK
    const zai = await ZAI.create()

    // First, get analysis from AI
    const analysisPrompt = {
      system: `You are a UK parking appeals specialist with extensive knowledge of parking regulations, traffic management acts, and appeal procedures. Your task is to analyze the provided appeal case and determine the strongest legal arguments.

Key considerations:
1. Use only the confirmed facts provided in the appeal data
2. Focus on UK-specific parking regulations and case law
3. Consider the issuer type (council vs private company) as this affects the applicable regulations
4. Base your analysis on the Traffic Management Act 2004 for council PCNs
5. For private companies, focus on POFA 2012 and BPA/IPC codes of practice
6. Never invent facts or assume evidence that isn't provided
7. Be realistic about success chances based on the provided information

Provide your analysis in the following JSON format:
{
  "caseAssessment": "Brief overall assessment of the case strength",
  "keyLegalPoints": ["Point 1", "Point 2", "Point 3"],
  "evidenceRecommendations": ["Evidence 1", "Evidence 2"],
  "successLikelihood": "high|medium|low",
  "additionalAdvice": "Additional strategic advice"
}`,
      user: `Please analyze this parking appeal case:

APPEAL DETAILS:
- PCN Number: ${appealData.pcnNumber}
- Issuer: ${appealData.councilOrCompany} (${appealData.issuerType})
- Vehicle: ${appealData.confirmedVrm} (${appealData.vehicleMake || 'Unknown make'} ${appealData.vehicleModel || 'Unknown model'}, ${appealData.vehicleColour || 'Unknown colour'})
- Contravention: ${appealData.contraventionCode} - ${appealData.contraventionText}
- Date & Time: ${appealData.confirmedDateTime}
- Location: ${appealData.confirmedLocation}

PRIMARY DEFENCE: ${rulesAnalysis.primaryDefence.name}
- Reasoning: ${rulesAnalysis.primaryDefence.reasoning}
- Strength: ${rulesAnalysis.primaryDefence.strength}

SUPPORTING DEFENCES: ${rulesAnalysis.supportingDefences.map(d => d.name).join(', ')}

KEY FACTORS:
- Payment made: ${appealData.paid ? 'Yes' : 'No'} ${appealData.paid ? `(until ${appealData.paidUntil})` : ''}
- Loading/unloading: ${appealData.loadingUnloading ? 'Yes' : 'No'}
- Passenger drop-off: ${appealData.passengerDropoff ? 'Yes' : 'No'}
- Blue Badge holder: ${appealData.blueBadge ? 'Yes' : 'No'}
- Medical emergency: ${appealData.medicalEmergency ? 'Yes' : 'No'}
- Signage visible: ${appealData.signageVisible ? 'Yes' : 'No'}
- Markings visible: ${appealData.markingsVisible ? 'Yes' : 'No'}
- No observation period: ${appealData.noObservationPeriod ? 'Yes' : 'No'}
- Late council reply: ${appealData.lateCouncilReply ? 'Yes' : 'No'}

Additional notes: ${appealData.additionalNotes || 'None'}

Please provide a comprehensive analysis of this appeal case.`
    }

    const analysisResponse = await zai.chat.completions.create({
      messages: [
        { role: "system", content: analysisPrompt.system },
        { role: "user", content: analysisPrompt.user }
      ],
      max_tokens: 1000,
      temperature: 0.3
    })

    const analysisContent = analysisResponse.choices[0]?.message?.content
    if (!analysisContent) {
      throw new Error("Failed to get analysis from AI")
    }

    // Parse analysis response
    let analysis
    try {
      const jsonMatch = analysisContent.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("No JSON found in analysis response")
      }
      analysis = JSON.parse(jsonMatch[0])
    } catch (error) {
      console.error("Failed to parse analysis response:", error)
      return NextResponse.json({ 
        error: "Failed to parse analysis",
        rawAnalysis: analysisContent 
      }, { status: 500 })
    }

    // Now generate the appeal letter
    const letterPrompt = {
      system: `You are a professional UK parking appeal letter writer. Your task is to draft a formal, persuasive appeal letter based on the provided case analysis and facts.

Requirements:
1. Use UK spelling and grammar throughout
2. Be respectful but firm in tone
3. Structure the letter formally with clear sections
4. Reference specific regulations where appropriate
5. Focus on the primary defence with supporting arguments
6. Include all relevant facts from the appeal data
7. Never invent facts or evidence not provided
8. Keep the letter concise (300-500 words) but comprehensive
9. Include a clear call to action
10. Format for readability with appropriate paragraphs

Letter structure:
- Your reference (PCN number)
- Date
- Recipient address
- Subject line
- Salutation
- Introduction (state purpose of letter)
- Main body (primary defence + supporting arguments)
- Conclusion (request for cancellation)
- Formal closing
- Your signature block`,
      user: `Please draft a formal parking appeal letter based on this case:

CASE DETAILS:
- PCN Number: ${appealData.pcnNumber}
- Issuer: ${appealData.councilOrCompany}
- Vehicle: ${appealData.confirmedVrm}
- Contravention: ${appealData.contraventionCode} - ${appealData.contraventionText}
- Date & Time: ${appealData.confirmedDateTime}
- Location: ${appealData.confirmedLocation}

CASE ANALYSIS:
- Assessment: ${analysis.caseAssessment}
- Success Likelihood: ${analysis.successLikelihood}
- Key Legal Points: ${analysis.keyLegalPoints.join(', ')}
- Evidence Needed: ${analysis.evidenceRecommendations.join(', ')}

PRIMARY DEFENCE: ${rulesAnalysis.primaryDefence.name}
- Description: ${rulesAnalysis.primaryDefence.description}
- Reasoning: ${rulesAnalysis.primaryDefence.reasoning}

SUPPORTING DEFENCES: ${rulesAnalysis.supportingDefences.map(d => `${d.name}: ${d.description}`).join('; ')}

KEY FACTORS TO INCLUDE:
${appealData.paid ? `- Payment was made until ${appealData.paidUntil}` : ''}
${appealData.loadingUnloading ? '- Vehicle was being used for loading/unloading goods' : ''}
${appealData.passengerDropoff ? '- Vehicle was picking up/dropping off passengers' : ''}
${appealData.blueBadge ? '- Driver holds a valid Blue Badge' : ''}
${appealData.medicalEmergency ? '- There was a medical emergency' : ''}
${!appealData.signageVisible ? '- Parking signage was unclear or not visible' : ''}
${!appealData.markingsVisible ? '- Road markings were unclear or not visible' : ''}
${appealData.noObservationPeriod ? '- No proper observation period was observed' : ''}
${appealData.lateCouncilReply ? '- Council failed to respond within 56 days to previous challenge' : ''}
${appealData.additionalNotes ? `- Additional information: ${appealData.additionalNotes}` : ''}

Please draft a professional appeal letter that maximises the chances of success while remaining factual and respectful.`
    }

    const letterResponse = await zai.chat.completions.create({
      messages: [
        { role: "system", content: letterPrompt.system },
        { role: "user", content: letterPrompt.user }
      ],
      max_tokens: 800,
      temperature: 0.4
    })

    const letterContent = letterResponse.choices[0]?.message?.content
    if (!letterContent) {
      throw new Error("Failed to generate appeal letter")
    }

    // Update appeal in database with generated letter and analysis
    // This would typically be done here, but we'll return the data for now

    return NextResponse.json({
      success: true,
      letter: letterContent,
      analysis,
      primaryDefence: rulesAnalysis.primaryDefence,
      supportingDefences: rulesAnalysis.supportingDefences,
      evidenceRecommendations: analysis.evidenceRecommendations,
      successLikelihood: analysis.successLikelihood,
      message: "Appeal letter generated successfully"
    })

  } catch (error) {
    console.error("Letter generation error:", error)
    return NextResponse.json({ 
      error: "Internal server error during letter generation",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}