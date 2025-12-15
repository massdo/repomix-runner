import { z } from 'zod';

export const WebviewLoadedSchema = z.object({
  command: z.literal('webviewLoaded'),
});

export const RunBundleSchema = z.object({
  command: z.literal('runBundle'),
  bundleId: z.string().min(1),
  compress: z.boolean().optional(),
});

export const CancelBundleSchema = z.object({
  command: z.literal('cancelBundle'),
  bundleId: z.string().min(1),
});

export const CopyBundleOutputSchema = z.object({
  command: z.literal('copyBundleOutput'),
  bundleId: z.string().min(1),
});

export const RunDefaultRepomixSchema = z.object({
  command: z.literal('runDefaultRepomix'),
  compress: z.boolean().optional(),
});

export const CancelDefaultRepomixSchema = z.object({
  command: z.literal('cancelDefaultRepomix'),
});

export const CopyDefaultRepomixOutputSchema = z.object({
  command: z.literal('copyDefaultRepomixOutput'),
});

export const CheckApiKeySchema = z.object({
  command: z.literal('checkApiKey'),
});

export const SaveApiKeySchema = z.object({
  command: z.literal('saveApiKey'),
  apiKey: z.string().startsWith('AIza', "API Key must start with 'AIza'").min(30, "API Key is too short"),
});

export const RunSmartAgentSchema = z.object({
  command: z.literal('runSmartAgent'),
  query: z.string().min(1).max(1000),
});

export const WebviewMessageSchema = z.discriminatedUnion('command', [
  WebviewLoadedSchema,
  RunBundleSchema,
  CancelBundleSchema,
  CopyBundleOutputSchema,
  RunDefaultRepomixSchema,
  CancelDefaultRepomixSchema,
  CopyDefaultRepomixOutputSchema,
  CheckApiKeySchema,
  SaveApiKeySchema,
  RunSmartAgentSchema,
]);

export type WebviewMessage = z.infer<typeof WebviewMessageSchema>;
