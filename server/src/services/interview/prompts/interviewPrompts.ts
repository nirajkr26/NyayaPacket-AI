export interface CategoryPromptFlow {
  initialGreeting: string;
  keyQuestions: string[];
  suggestedResponses: string[];
}

export const CATEGORY_PROMPT_FLOWS: Record<string, CategoryPromptFlow> = {
  "unpaid-wages": {
    initialGreeting:
      "Hello. I am your NyayaPacket AI intake assistant. I will help you organize the facts of your unpaid salary or employment dispute so an advocate can evaluate it. Could you tell me what role you held, when you joined, and for which months your salary is pending?",
    keyQuestions: [
      "What was your agreed monthly salary, and what is the total unpaid amount owed?",
      "Do you have a written appointment letter, contract, or salary slips from your employer?",
      "Have you formally communicated with HR or management regarding the pending salary (e.g., via email or WhatsApp)? What was their response?",
      "Did you work through a notice period, or were you asked to stop working immediately?",
      "Has your employer issued an experience letter, relieving letter, or Form 16?",
    ],
    suggestedResponses: [
      "I have my appointment letter and bank statements showing missing payments.",
      "My salary was withheld for the last 2 months without any explanation.",
      "I sent multiple follow-up emails to HR but received no response.",
    ],
  },
  "tenant-landlord-disputes": {
    initialGreeting:
      "Hello. I am here to help you document your tenant-landlord dispute. Whether this concerns an unreturned security deposit, eviction threat, or maintenance dispute, let's establish the facts. To start, what was the rented property address, your monthly rent, and the security deposit amount paid?",
    keyQuestions: [
      "Was there a signed rent agreement, and what were the lease start and end dates?",
      "What was the total security deposit amount paid, and did you receive a receipt or pay via UPI/bank transfer?",
      "Did you provide written notice before vacating the property, and on what date did you hand over the keys?",
      "What reason has the landlord given for deducting or withholding your deposit?",
      "Do you have photos, videos, or messages confirming the condition of the house upon vacating?",
    ],
    suggestedResponses: [
      "I have the registered lease agreement and UPI transaction receipts for the deposit.",
      "The landlord is making unfair deductions for normal wear and tear.",
      "I vacated on time after giving 30 days notice as per our agreement.",
    ],
  },
  "consumer-complaints": {
    initialGreeting:
      "Hello. Let's organize the details of your consumer complaint. I will help you record what product or service failed, what damages you suffered, and what resolution you are seeking. What product or service did you purchase, from which seller, and on what date?",
    keyQuestions: [
      "What was the purchase price, and do you have the official tax invoice, bill, or receipt?",
      "What specific defect, deficiency, or misleading claim occurred?",
      "Did the product come with a manufacturer warranty or service guarantee?",
      "When did you first notify customer support, and what ticket number or written response did they provide?",
      "What specific remedy are you seeking (e.g., full refund, product replacement, or compensation)?",
    ],
    suggestedResponses: [
      "I have the purchase invoice and photos of the defective item.",
      "Customer support promised a replacement within 7 days but never delivered.",
      "The seller refused to honor the manufacturer's warranty.",
    ],
  },
};

export function getPromptFlowForCategory(categorySlug: string): CategoryPromptFlow {
  return (
    CATEGORY_PROMPT_FLOWS[categorySlug] || {
      initialGreeting:
        "Hello. I am your NyayaPacket AI intake assistant. Let's organize the key facts and timeline of your legal dispute so a qualified advocate can review your case. Could you briefly describe what happened?",
      keyQuestions: [
        "When did this dispute or incident begin?",
        "Who is the opposing party or organization involved?",
        "What written agreements, receipts, or communications exist?",
        "What specific outcome or legal relief are you looking for?",
      ],
      suggestedResponses: [
        "I have documents and message records available.",
        "The issue started 2 months ago.",
      ],
    }
  );
}
