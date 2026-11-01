import { InterviewRole, StatementType, CaseStatus } from "@prisma/client";
import type { User, InterviewSession, InterviewMessage } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { getPromptFlowForCategory } from "./prompts/interviewPrompts.js";
import { NotFoundError, ForbiddenError, ValidationError } from "../../utils/errors.js";
import { logAuditEvent } from "../audit/auditLogger.js";

export async function startOrResumeSession(caseId: string, user: User) {
  // 1. Verify Case exists & belongs to user
  const targetCase = await prisma.case.findUnique({
    where: { id: caseId },
    include: { category: true },
  });

  if (!targetCase) {
    throw new NotFoundError("Case not found");
  }
  if (targetCase.ownerId !== user.id && user.role !== "ADMIN") {
    throw new ForbiddenError("Only case owner may initiate an intake interview", "CASE_ACCESS_DENIED");
  }

  // 2. Check for existing active session
  const existingSession = await prisma.interviewSession.findFirst({
    where: {
      caseId,
      userId: user.id,
      isActive: true,
    },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (existingSession) {
    return existingSession;
  }

  // 3. Create new session and seed initial greeting
  const promptFlow = getPromptFlowForCategory(targetCase.category.slug);

  const newSession = await prisma.$transaction(async (tx) => {
    const created = await tx.interviewSession.create({
      data: {
        caseId,
        userId: user.id,
        language: "en",
        isActive: true,
      },
    });

    // Initial AI greeting message
    await tx.interviewMessage.create({
      data: {
        sessionId: created.id,
        role: InterviewRole.AI,
        content: promptFlow.initialGreeting,
      },
    });

    // Update case status if in NEW_CASE
    if (targetCase.status === CaseStatus.NEW_CASE) {
      await tx.case.update({
        where: { id: caseId },
        data: { status: CaseStatus.INTERVIEW_IN_PROGRESS },
      });
      await tx.caseStatusHistory.create({
        data: {
          caseId,
          changedById: user.id,
          oldStatus: CaseStatus.NEW_CASE,
          newStatus: CaseStatus.INTERVIEW_IN_PROGRESS,
          note: "Citizen began AI intake interview session",
        },
      });
    }

    return created;
  });

  return prisma.interviewSession.findUniqueOrThrow({
    where: { id: newSession.id },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function getSession(caseId: string, sessionId: string) {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!session || session.caseId !== caseId) {
    throw new NotFoundError("Interview session not found on this case");
  }

  return session;
}

export async function addMessage(
  sessionId: string,
  userMessageContent: string,
  audioStorageKey?: string | null
) {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: {
      case: { include: { category: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!session) {
    throw new NotFoundError("Interview session not found");
  }
  if (!session.isActive) {
    throw new ValidationError("This interview session has already been completed");
  }

  const promptFlow = getPromptFlowForCategory(session.case.category.slug);

  // Count existing user messages to select next question
  const userMessagesCount = session.messages.filter((m) => m.role === InterviewRole.USER).length;
  let nextAiQuestion: string;

  if (userMessagesCount < promptFlow.keyQuestions.length) {
    nextAiQuestion = promptFlow.keyQuestions[userMessagesCount]!;
  } else {
    nextAiQuestion =
      "Thank you. You have provided the primary facts needed to summarize your dispute. Is there any additional detail, witness, or message you want to note before we compile your statement?";
  }

  // Atomic write of User message and AI response
  const [userMsg, aiMsg] = await prisma.$transaction([
    prisma.interviewMessage.create({
      data: {
        sessionId,
        role: InterviewRole.USER,
        content: userMessageContent.trim(),
        audioStorageKey: audioStorageKey || null,
      },
    }),
    prisma.interviewMessage.create({
      data: {
        sessionId,
        role: InterviewRole.AI,
        content: nextAiQuestion,
      },
    }),
  ]);

  return { userMessage: userMsg, aiResponse: aiMsg };
}

export async function completeInterview(caseId: string, sessionId: string, user: User) {
  const session = await prisma.interviewSession.findUnique({
    where: { id: sessionId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      case: true,
    },
  });

  if (!session || session.caseId !== caseId) {
    throw new NotFoundError("Interview session not found");
  }
  if (session.case.ownerId !== user.id && user.role !== "ADMIN") {
    throw new ForbiddenError("Only case owner may conclude the interview", "CASE_ACCESS_DENIED");
  }

  // Compile user messages into structured citizen statement
  const userMessages = session.messages.filter((m) => m.role === InterviewRole.USER);
  if (userMessages.length === 0) {
    throw new ValidationError("Cannot complete an interview without citizen responses");
  }

  const compiledContent = userMessages.map((m) => m.content).join("\n\n");

  const [statement] = await prisma.$transaction([
    // Create citizen statement
    prisma.statement.create({
      data: {
        caseId,
        authorId: user.id,
        type: StatementType.TEXT,
        content: compiledContent,
        language: session.language,
      },
    }),
    // Mark session completed
    prisma.interviewSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    }),
    // Progress case status to EVIDENCE_COLLECTION
    prisma.case.update({
      where: { id: caseId },
      data: { status: CaseStatus.EVIDENCE_COLLECTION },
    }),
    prisma.caseStatusHistory.create({
      data: {
        caseId,
        changedById: user.id,
        oldStatus: session.case.status,
        newStatus: CaseStatus.EVIDENCE_COLLECTION,
        note: "Citizen concluded intake interview; ready for evidence upload",
      },
    }),
  ]);

  await logAuditEvent({
    actorId: user.id,
    action: "INTERVIEW_COMPLETED",
    resourceType: "INTERVIEW_SESSION",
    resourceId: sessionId,
    metadata: { statementId: statement.id, caseId },
  });

  return statement;
}
