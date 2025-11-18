import fs from 'fs/promises';
import path from 'path';
import { optimize } from 'svgo';
import { FigmaIconBotConfig, IconData, SyncResult } from './types.js';

export class IconProcessor {
  private config: FigmaIconBotConfig;

  constructor(config: FigmaIconBotConfig) {
    this.config = config;
  }

  /**
   * Process and save icons to disk
   */
  async processIcons(icons: IconData[]): Promise<SyncResult> {
    const result: SyncResult = {
      added: [],
      updated: [],
      deleted: [],
      unchanged: [],
      errors: [],
    };

    // Create output directory if it doesn't exist
    await fs.mkdir(this.config.output.directory, { recursive: true });

    // Process each icon
    for (const icon of icons) {
      try {
        // Apply naming transformation
        const transformedName = this.transformName(icon.name);

        // Optimize SVG if enabled
        let svgContent = icon.svg;
        if (this.config.svgo?.enabled) {
          svgContent = this.optimizeSvg(icon.svg);
        }

        // Save in requested formats
        for (const format of this.config.output.formats) {
          if (format === 'svg') {
            const result_item = await this.saveSvg(transformedName, svgContent);
            this.categorizeResult(result, result_item);
          } else if (format === 'react') {
            const result_item = await this.saveReactComponent(transformedName, svgContent);
            this.categorizeResult(result, result_item);
          }
        }
      } catch (error) {
        result.errors.push({
          file: icon.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Check for deleted icons
    const currentIconNames = new Set(
      icons.map((icon) => this.transformName(icon.name))
    );
    const deletedIcons = await this.findDeletedIcons(currentIconNames);
    result.deleted = deletedIcons;

    return result;
  }

  /**
   * Transform icon name based on naming configuration
   */
  private transformName(name: string): string {
    const namingConfig = this.config.naming || { transform: 'preserve', sanitize: true };
    let transformed = name;

    // Apply transformation
    switch (namingConfig.transform) {
      case 'kebab-case':
        transformed = name
          .replace(/([a-z])([A-Z])/g, '$1-$2') // Handle camelCase
          .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
          .toLowerCase();
        break;
      case 'camelCase':
        transformed = name
          .replace(/[-_\s]+(.)/g, (_, char) => char.toUpperCase()) // Convert to camelCase
          .replace(/^(.)/, (char) => char.toLowerCase()); // Ensure first char is lowercase
        break;
      case 'PascalCase':
        transformed = name
          .replace(/[-_\s]+(.)/g, (_, char) => char.toUpperCase()) // Convert to PascalCase
          .replace(/^(.)/, (char) => char.toUpperCase()); // Ensure first char is uppercase
        break;
      case 'preserve':
      default:
        // Keep as-is
        break;
    }

    // Sanitize for filesystem if enabled (default: true)
    if (namingConfig.sanitize !== false) {
      transformed = this.sanitizeForFilesystem(transformed);
    }

    return transformed;
  }

  /**
   * Sanitize name for filesystem compatibility
   */
  private sanitizeForFilesystem(name: string): string {
    // Remove or replace characters that are problematic for filesystems
    return name
      .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid chars with hyphen
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  }

  /**
   * Optimize SVG using SVGO
   */
  private optimizeSvg(svg: string): string {
    const result = optimize(svg, {
      plugins: this.config.svgo?.plugins || [],
    });

    return result.data;
  }

  /**
   * Save SVG file
   */
  private async saveSvg(name: string, svg: string): Promise<{ path: string; status: 'added' | 'updated' | 'unchanged' }> {
    const filePath = path.join(this.config.output.directory, `${name}.svg`);

    // Check if file exists
    let status: 'added' | 'updated' | 'unchanged' = 'added';
    try {
      const existingContent = await fs.readFile(filePath, 'utf-8');
      if (existingContent === svg) {
        status = 'unchanged';
      } else {
        status = 'updated';
      }
    } catch {
      // File doesn't exist, will be added
    }

    if (status !== 'unchanged') {
      await fs.writeFile(filePath, svg, 'utf-8');
    }

    return { path: filePath, status };
  }

  /**
   * Convert SVG to React component
   */
  private svgToReactComponent(name: string, svg: string): string {
    const reactConfig = this.config.output.react;
    const componentName = reactConfig?.componentPrefix
      ? reactConfig.componentPrefix + this.toPascalCase(name)
      : this.toPascalCase(name);

    // Extract SVG attributes and content
    const svgMatch = svg.match(/<svg([^>]*)>([\s\S]*?)<\/svg>/);
    if (!svgMatch) {
      throw new Error('Invalid SVG content');
    }

    const [, attributes, content] = svgMatch;

    // Convert attributes to React-friendly format
    const reactAttributes = attributes
      .replace(/(\w+)-(\w+)/g, (_, p1, p2) => `${p1}${p2.charAt(0).toUpperCase()}${p2.slice(1)}`)
      .replace(/class=/g, 'className=')
      .replace(/stroke-width/g, 'strokeWidth')
      .replace(/fill-rule/g, 'fillRule')
      .replace(/clip-rule/g, 'clipRule');

    const isTypeScript = reactConfig?.typescript ?? true;
    const propsType = isTypeScript ? ': React.SVGProps<SVGSVGElement>' : '';

    const component = `import React from 'react';

${reactConfig?.exportType === 'default' ? 'export default' : 'export'} function ${componentName}(props${propsType}) {
  return (
    <svg${reactAttributes} {...props}>
      ${content.trim()}
    </svg>
  );
}`;

    return component;
  }

  /**
   * Save React component
   */
  private async saveReactComponent(
    name: string,
    svg: string
  ): Promise<{ path: string; status: 'added' | 'updated' | 'unchanged' }> {
    const reactConfig = this.config.output.react;
    const ext = reactConfig?.typescript ? '.tsx' : '.jsx';
    const componentName = this.toPascalCase(name);
    const filePath = path.join(this.config.output.directory, `${componentName}${ext}`);

    const componentCode = this.svgToReactComponent(name, svg);

    // Check if file exists
    let status: 'added' | 'updated' | 'unchanged' = 'added';
    try {
      const existingContent = await fs.readFile(filePath, 'utf-8');
      if (existingContent === componentCode) {
        status = 'unchanged';
      } else {
        status = 'updated';
      }
    } catch {
      // File doesn't exist, will be added
    }

    if (status !== 'unchanged') {
      await fs.writeFile(filePath, componentCode, 'utf-8');
    }

    return { path: filePath, status };
  }

  /**
   * Find icons that were deleted from Figma
   */
  private async findDeletedIcons(currentIconNames: Set<string>): Promise<string[]> {
    const deleted: string[] = [];

    try {
      const files = await fs.readdir(this.config.output.directory);

      for (const file of files) {
        const ext = path.extname(file);
        if (ext === '.svg' || ext === '.tsx' || ext === '.jsx') {
          const baseName = path.basename(file, ext);

          if (!currentIconNames.has(baseName)) {
            deleted.push(file);
            // Delete the file
            const filePath = path.join(this.config.output.directory, file);
            await fs.unlink(filePath);
          }
        }
      }
    } catch {
      // Directory might not exist yet
    }

    return deleted;
  }

  /**
   * Convert to PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^(.)/, (c) => c.toUpperCase());
  }

  /**
   * Categorize sync result
   */
  private categorizeResult(
    result: SyncResult,
    item: { path: string; status: 'added' | 'updated' | 'unchanged' }
  ): void {
    switch (item.status) {
      case 'added':
        result.added.push(item.path);
        break;
      case 'updated':
        result.updated.push(item.path);
        break;
      case 'unchanged':
        result.unchanged.push(item.path);
        break;
    }
  }
}
