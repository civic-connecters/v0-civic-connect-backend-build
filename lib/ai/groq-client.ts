import { groq } from "@ai-sdk/groq"
import { generateText, generateObject } from "ai"

export class GroqAIService {
  private model = groq("llama-3.1-70b-versatile")

  async categorizeIssue(
    title: string,
    description: string,
  ): Promise<{
    category: string
    priority: "low" | "medium" | "high" | "urgent"
    tags: string[]
    confidence: number
  }> {
    const { object } = await generateObject({
      model: this.model,
      schema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: [
              "infrastructure",
              "safety",
              "environment",
              "transportation",
              "housing",
              "utilities",
              "community",
              "other",
            ],
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"],
          },
          tags: {
            type: "array",
            items: { type: "string" },
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
          },
        },
        required: ["category", "priority", "tags", "confidence"],
      },
      prompt: `Analyze this civic issue and categorize it:
      
Title: ${title}
Description: ${description}

Categorize this issue into one of the predefined categories, assign a priority level based on urgency and impact, suggest relevant tags, and provide a confidence score for your analysis.`,
    })

    return object
  }

  async moderateContent(content: string): Promise<{
    isAppropriate: boolean
    reason?: string
    suggestedEdit?: string
  }> {
    const { object } = await generateObject({
      model: this.model,
      schema: {
        type: "object",
        properties: {
          isAppropriate: { type: "boolean" },
          reason: { type: "string" },
          suggestedEdit: { type: "string" },
        },
        required: ["isAppropriate"],
      },
      prompt: `Review this content for appropriateness in a civic engagement platform:

Content: ${content}

Check for:
- Hate speech or discriminatory language
- Personal attacks or harassment
- Spam or irrelevant content
- Inappropriate language for a public forum
- Misinformation or false claims

If inappropriate, provide a reason and suggest an edited version if possible.`,
    })

    return object
  }

  async generateIssueSummary(issue: {
    title: string
    description: string
    comments: Array<{ content: string }>
    votes: number
  }): Promise<string> {
    const { text } = await generateText({
      model: this.model,
      prompt: `Create a concise summary of this civic issue for administrators:

Title: ${issue.title}
Description: ${issue.description}
Votes: ${issue.votes}
Comments: ${issue.comments.map((c) => c.content).join("\n")}

Provide a 2-3 sentence summary highlighting the key points, community sentiment, and any actionable insights.`,
    })

    return text
  }

  async suggestSolutions(issue: {
    title: string
    description: string
    category: string
  }): Promise<string[]> {
    const { text } = await generateText({
      model: this.model,
      prompt: `Suggest practical solutions for this civic issue:

Title: ${issue.title}
Description: ${issue.description}
Category: ${issue.category}

Provide 3-5 actionable solutions that local government or community organizations could implement. Focus on realistic, cost-effective approaches.`,
    })

    // Parse the response into an array of solutions
    return text
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .slice(0, 5)
  }

  async analyzeEngagement(
    issues: Array<{
      title: string
      category: string
      votes: number
      comments: number
      created_at: string
    }>,
  ): Promise<{
    insights: string
    trends: string[]
    recommendations: string[]
  }> {
    const { object } = await generateObject({
      model: this.model,
      schema: {
        type: "object",
        properties: {
          insights: { type: "string" },
          trends: {
            type: "array",
            items: { type: "string" },
          },
          recommendations: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: ["insights", "trends", "recommendations"],
      },
      prompt: `Analyze community engagement patterns from these civic issues:

${issues
  .map(
    (issue) => `
- ${issue.title} (${issue.category})
  Votes: ${issue.votes}, Comments: ${issue.comments}
  Date: ${issue.created_at}
`,
  )
  .join("\n")}

Provide insights about community engagement, identify trends in issue types and participation, and recommend strategies to improve civic engagement.`,
    })

    return object
  }
}

export const groqAI = new GroqAIService()
