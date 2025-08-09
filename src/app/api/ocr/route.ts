import { NextRequest, NextResponse } from "next/server"
import ZAI from "z-ai-web-dev-sdk"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("image") as File

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    // Convert file to base64 for OCR processing
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64Image = buffer.toString("base64")

    // Initialize ZAI SDK
    const zai = await ZAI.create()

    // Use vision capabilities to extract text from image
    const visionResult = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an OCR specialist for UK parking tickets. Extract all information from this parking ticket image and return it in a structured JSON format.

Focus on extracting:
1. Issuer type (council or private company)
2. PCN/PN number
3. Vehicle registration mark (VRM)
4. Contravention code and description
5. Issue date and time
6. Location
7. Observation start and end times (if visible)
8. CEO notes (if printed)
9. Any company logos or keywords indicating private company (BPA/IPC, "Parking Charge Notice", etc.)

Return the data in this exact JSON format:
{
  "issuerType": "council|private",
  "councilOrCompany": "name of council or company",
  "pcnNumber": "PCN number",
  "vrm": "vehicle registration",
  "contraventionCode": "code",
  "contraventionText": "full contravention description",
  "issueDateTime": "YYYY-MM-DD HH:MM",
  "location": "full location address",
  "observationStart": "YYYY-MM-DD HH:MM (if available)",
  "observationEnd": "YYYY-MM-DD HH:MM (if available)",
  "ceoNotes": "notes text (if available)",
  "confidence": {
    "issuerType": 0.0-1.0,
    "pcnNumber": 0.0-1.0,
    "vrm": 0.0-1.0,
    "contraventionCode": 0.0-1.0,
    "issueDateTime": 0.0-1.0,
    "location": 0.0-1.0
  }
}

If any field cannot be determined, use null for that field. For confidence scores, estimate how confident you are in each extraction (0.0 to 1.0).`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all parking ticket information from this image:"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    })

    const content = visionResult.choices[0]?.message?.content

    if (!content) {
      return NextResponse.json({ error: "Failed to extract text from image" }, { status: 500 })
    }

    // Parse the JSON response from the AI
    let extractedData
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("No JSON found in response")
      }
      extractedData = JSON.parse(jsonMatch[0])
    } catch (error) {
      console.error("Failed to parse OCR response:", error)
      return NextResponse.json({ 
        error: "Failed to parse extracted data",
        rawResponse: content 
      }, { status: 500 })
    }

    // Validate required fields
    const requiredFields = ["issuerType", "pcnNumber", "vrm", "contraventionCode", "issueDateTime", "location"]
    const missingFields = requiredFields.filter(field => !extractedData[field])
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        error: "Missing required fields",
        missingFields,
        extractedData 
      }, { status: 400 })
    }

    // Add contravention explanation
    const contraventionExplanations: Record<string, string> = {
      "01": "Parked in a restricted street during prescribed hours",
      "02": "Parked or loading/unloading in a restricted street where waiting and loading/unloading restrictions are in force",
      "06": "Parked without clearly displaying a valid pay & display ticket or voucher",
      "11": "Parked without payment of the parking charge",
      "12": "Parked in a residents' zone or space without a valid permit",
      "16": "Parked in a permit space without displaying a valid permit",
      "19": "Parked in a residents' bay without a valid virtual permit or physical permit",
      "21": "Parked in a suspended bay/space or area",
      "22": "Re-parked in the same parking place within one hour of leaving",
      "23": "Parked in a parking place or area not designated for that class of vehicle",
      "24": "Not parked correctly within the markings of the bay or space",
      "25": "Parked in a loading place during restricted hours without loading",
      "26": "Vehicle parked more than 50cm from the edge of the carriageway and not within a designated parking place",
      "27": "Parked adjacent to a dropped footway",
      "30": "Parked for longer than permitted",
      "40": "Parked in a designated disabled person's parking place without displaying a valid disabled person's badge",
      "47": "Stopped on a restricted bus stop or stand",
      "48": "Stopped on a restricted bus stop or stand during prohibited hours",
      "50": "Parked against the flow of traffic",
      "61": "Parked with engine running where prohibited",
      "62": "Parked with one or more wheels on or over a footpath or any part of a road other than a carriageway",
      "73": "Parked in a taxi rank",
      "74": "Parked in a cycle lane",
      "80": "Parked in a mandatory cycle lane",
      "85": "Parked in a pedestrian zone",
      "86": "Parked in a pedestrian zone during restricted hours",
      "87": "Parked in a restricted area during prescribed hours",
      "91": "Parked in a bay marked for police vehicles",
      "93": "Parked contrary to a prohibition on certain types of vehicle",
      "95": "Parked on a clearway",
      "96": "Parked in a cycle track",
      "97": "Parked on red route",
      "99": "Parked in a bay reserved for specific vehicles (e.g., car club, electric vehicles)"
    }

    extractedData.contraventionExplanation = contraventionExplanations[extractedData.contraventionCode] || 
      "This contravention code indicates a parking violation. Please verify the exact meaning with the issuing authority."

    return NextResponse.json({
      success: true,
      data: extractedData,
      message: "OCR extraction completed successfully"
    })

  } catch (error) {
    console.error("OCR processing error:", error)
    return NextResponse.json({ 
      error: "Internal server error during OCR processing",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}