import { z } from 'zod';

// Output style enum
export const repomixOutputStyleSchema = z.enum(['plain', 'xml', 'markdown']);
export type RepomixOutputStyle = z.infer<typeof repomixOutputStyleSchema>;

export const defaultFilePathMap: Record<RepomixOutputStyle, string> = {
  plain: 'repomix-output.txt',
  markdown: 'repomix-output.md',
  xml: 'repomix-output.xml',
} as const;

// Base config schema (sans valeurs par défaut)
export const repomixConfigBaseSchema = z.object({
  output: z
    .object({
      filePath: z.string().optional(),
      style: repomixOutputStyleSchema.optional(),
      fileSummary: z.boolean().optional(),
      directoryStructure: z.boolean().optional(),
      removeComments: z.boolean().optional(),
      removeEmptyLines: z.boolean().optional(),
      topFilesLength: z.number().optional(),
      showLineNumbers: z.boolean().optional(),
      copyToClipboard: z.boolean().optional(),
    })
    .optional(),
  include: z.array(z.string()).optional(),
  ignore: z
    .object({
      useGitignore: z.boolean().optional(),
      useDefaultPatterns: z.boolean().optional(),
      customPatterns: z.array(z.string()).optional(),
    })
    .optional(),
  security: z
    .object({
      enableSecurityCheck: z.boolean().optional(),
    })
    .optional(),
});

// Default config schema (avec valeurs par défaut)
export const repomixConfigDefaultSchema = z.object({
  output: z
    .object({
      filePath: z.string().default(defaultFilePathMap.plain),
      style: repomixOutputStyleSchema.default('plain'),
      fileSummary: z.boolean().default(true),
      directoryStructure: z.boolean().default(true),
      removeComments: z.boolean().default(false),
      removeEmptyLines: z.boolean().default(false),
      topFilesLength: z.number().default(5),
      showLineNumbers: z.boolean().default(false),
      copyToClipboard: z.boolean().default(false),
    })
    .default({}),
  include: z.array(z.string()).default([]),
  ignore: z
    .object({
      useGitignore: z.boolean().default(true),
      useDefaultPatterns: z.boolean().default(true),
      customPatterns: z.array(z.string()).default([]),
    })
    .default({}),
  security: z
    .object({
      enableSecurityCheck: z.boolean().default(true),
    })
    .default({}),
});

// Runner config schema (specific to the VS Code extension)
export const runnerCopyModeSchema = z.enum(['content', 'file']);
export type RunnerCopyMode = z.infer<typeof runnerCopyModeSchema>;

export const defaultRunnerCopyMode: Record<RunnerCopyMode, string> = {
  content: 'content',
  file: 'file',
} as const;

export const repomixRunnerConfigBaseSchema = z
  .object({
    keepOutputFile: z.boolean().optional(),
    copyMode: runnerCopyModeSchema.optional(),
    useTargetAsOutput: z.boolean().optional(),
  })
  .and(repomixConfigBaseSchema);

export const repomixRunnerConfigDefaultSchema = z
  .object({
    keepOutputFile: z.boolean().default(true),
    copyMode: runnerCopyModeSchema.default('file'),
    useTargetAsOutput: z.boolean().default(true),
  })
  .and(repomixConfigDefaultSchema);

// Merged config schema
export const mergedConfigSchema = repomixRunnerConfigDefaultSchema.and(
  z.object({
    targetDirBasename: z.string(),
    targetDir: z.string(),
    targetPathRelative: z.string(),
  })
);

export type RepomixConfigFile = z.infer<typeof repomixConfigBaseSchema>;
export type RepomixConfigDefault = z.infer<typeof repomixConfigDefaultSchema>;
export type RepomixRunnerConfigFile = z.infer<typeof repomixRunnerConfigBaseSchema>;
export type RepomixRunnerConfigDefault = z.infer<typeof repomixRunnerConfigDefaultSchema>;
export type MergedConfig = z.infer<typeof mergedConfigSchema>;

export const defaultConfig = repomixRunnerConfigDefaultSchema.parse({});
