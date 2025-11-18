export interface FigmaIconBotConfig {
  figma: {
    fileKey: string;
    nodeId?: string;
    accessToken?: string; // Optional, can use env var
  };
  output: {
    directory: string;
    formats: ('svg' | 'react')[];
    react?: {
      typescript: boolean;
      exportType: 'named' | 'default';
      componentPrefix?: string;
    };
  };
  naming?: {
    transform: 'preserve' | 'kebab-case' | 'camelCase' | 'PascalCase';
    sanitize?: boolean; // Remove filesystem-unsafe characters
  };
  git: {
    enabled: boolean;
    branch?: string;
    commitMessage?: string;
    createPR: boolean;
    prTitle?: string;
    prBody?: string;
  };
  filters?: {
    includePattern?: string;
    excludePattern?: string;
  };
  svgo?: {
    enabled: boolean;
    plugins?: any[];
  };
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
}

export interface FigmaFile {
  document: FigmaNode;
  components: Record<string, FigmaComponent>;
}

export interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  componentSetId?: string;
}

export interface IconData {
  name: string;
  originalName: string;
  svg: string;
  nodeId: string;
}

export interface SyncResult {
  added: string[];
  updated: string[];
  deleted: string[];
  unchanged: string[];
  errors: Array<{ file: string; error: string }>;
}
