import * as path from 'path';

export function validateOutputFilePath(outputFilePath: string, workspaceRoot: string): void {
    // Standardize path first
    const normalizedPath = path.normalize(outputFilePath);

    // Resolve full path
    const resolvedPath = path.resolve(workspaceRoot, outputFilePath);

    // Check if it is within workspaceRoot
    const relative = path.relative(workspaceRoot, resolvedPath);

    // Check for path traversal or absolute path outside root
    // path.relative returns string starting with '..' if outside.
    // path.isAbsolute(relative) is a check for different drives on Windows (e.g. D:\ vs C:\)
    const isOutside = relative.startsWith('..') || path.isAbsolute(relative);

    // Also consider the case where relative is empty (it is the root) or a valid subpath
    if (isOutside) {
         throw new Error(`Security Violation: Output path '${outputFilePath}' resolves to '${resolvedPath}', which is outside the workspace root.`);
    }
}
