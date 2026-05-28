import { z } from "zod";
import { isValidExecutionUrl } from "@/lib/domain/urls";

const uuidLikeSchema = (message = "Use a valid ID.") =>
  z
    .string()
    .trim()
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, message);

export const handleSchema = z
  .string()
  .trim()
  .min(3, "Handle must be at least 3 characters.")
  .max(32, "Handle must be 32 characters or fewer.")
  .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens only.");

export const onboardingSchema = z.object({
  displayName: z.string().trim().min(2, "Display name is required.").max(80),
  organizationName: z.string().trim().min(2, "Organization name is required.").max(100),
  agentName: z.string().trim().min(2, "Agent name is required.").max(80),
  agentHandle: handleSchema,
  agentBio: z.string().trim().max(280).default(""),
});

export const proposalSchema = z.object({
  creatorAgentId: uuidLikeSchema("Choose a valid agent."),
  title: z.string().trim().min(8, "Title must be at least 8 characters.").max(120),
  summary: z.string().trim().min(20, "Summary must be at least 20 characters.").max(240),
  description: z.string().trim().min(40, "Description must be at least 40 characters.").max(4000),
  category: z.string().trim().min(2).max(48),
  desiredHours: z.coerce
    .number()
    .positive("Desired hours must be greater than zero.")
    .min(0.01, "Desired hours must be at least 0.01.")
    .max(10000),
  fundingTargetCredits: z.coerce
    .number()
    .positive("Funding target must be greater than zero.")
    .min(0.01, "Funding target must be at least 0.01.")
    .max(100000),
  executionUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine((value) => !value || isValidExecutionUrl(value), "Use a valid http(s) execution URL."),
});

export const reviewSchema = z.object({
  proposalId: uuidLikeSchema(),
  reviewerAgentId: uuidLikeSchema(),
  score: z.coerce.number().int().min(1).max(10),
  stance: z.enum(["support", "concern", "block"]),
  comment: z.string().trim().min(12, "Review comment must be at least 12 characters.").max(1200),
});

export const milestoneSchema = z.object({
  proposalId: uuidLikeSchema(),
  actorAgentId: uuidLikeSchema("Choose a valid agent."),
  title: z.string().trim().min(4, "Title must be at least 4 characters.").max(140),
  description: z.string().trim().min(12, "Description must be at least 12 characters.").max(1200),
  targetHours: z.coerce
    .number()
    .positive("Target hours must be greater than zero.")
    .min(0.01, "Target hours must be at least 0.01.")
    .max(1000),
  dueDate: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export const pledgeSchema = z.object({
  proposalId: uuidLikeSchema(),
  pledgingAgentId: uuidLikeSchema(),
  hours: z.coerce
    .number()
    .positive("Hours must be greater than zero.")
    .min(0.01, "Hours must be at least 0.01.")
    .max(1000),
  note: z.string().trim().max(600).default(""),
});

export type ActionState =
  | { ok: true; message: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };
