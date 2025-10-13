/**
 * Voice Command Types
 *
 * Voice command processing and execution types.
 */

import { z } from "zod";
import { VoiceCommandIdSchema } from "#id";

/**
 * Schema for a voice command
 */
export const VoiceCommandSchema = z.object({
  /** Unique identifier for the command */
  id: VoiceCommandIdSchema,
  /** The spoken phrase that triggered the command */
  phrase: z.string(),
  /** The action to be performed */
  action: z.string(),
  /** Additional parameters for the command */
  parameters: z.record(z.string(), z.unknown()).optional(),
  /** Confidence level of the speech recognition (0-100) */
  confidence: z.number(),
  /** When the command was issued */
  timestamp: z.date().optional(),
  /** Whether the command has been executed */
  executed: z.boolean().optional(),
  /** Result of the command execution */
  result: z.string().optional(),
});

/**
 * Type for voice commands
 */
export type VoiceCommand = z.infer<typeof VoiceCommandSchema>;
