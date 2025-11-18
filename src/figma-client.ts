import axios, { AxiosInstance } from 'axios';
import { FigmaFile, FigmaNode, IconData } from './types.js';

export class FigmaClient {
  private api: AxiosInstance;
  private fileKey: string;

  constructor(accessToken: string, fileKey: string) {
    this.fileKey = fileKey;
    this.api = axios.create({
      baseURL: 'https://api.figma.com/v1',
      headers: {
        'X-Figma-Token': accessToken,
      },
    });
  }

  /**
   * Fetch the Figma file structure
   */
  async getFile(): Promise<FigmaFile> {
    const response = await this.api.get(`/files/${this.fileKey}`);
    return response.data;
  }

  /**
   * Get a specific node by ID
   */
  async getNode(nodeId: string): Promise<FigmaNode> {
    const response = await this.api.get(`/files/${this.fileKey}/nodes`, {
      params: { ids: nodeId },
    });
    return response.data.nodes[nodeId]?.document;
  }

  /**
   * Find all icon nodes within a frame
   */
  async findIconNodes(nodeId?: string): Promise<FigmaNode[]> {
    let rootNode: FigmaNode;

    if (nodeId) {
      rootNode = await this.getNode(nodeId);
    } else {
      const file = await this.getFile();
      rootNode = file.document;
    }

    return this.traverseNodes(rootNode);
  }

  /**
   * Recursively traverse nodes to find components or frames
   */
  private traverseNodes(node: FigmaNode): FigmaNode[] {
    const icons: FigmaNode[] = [];

    // Include components and instances as potential icons
    if (
      node.type === 'COMPONENT' ||
      node.type === 'INSTANCE' ||
      node.type === 'FRAME' ||
      node.type === 'GROUP'
    ) {
      // If it's a component, it's likely an icon
      if (node.type === 'COMPONENT') {
        icons.push(node);
      }
      // Otherwise, keep traversing
      else if (node.children) {
        node.children.forEach((child) => {
          icons.push(...this.traverseNodes(child));
        });
      }
    }

    // Continue traversing children
    if (node.children && node.type !== 'COMPONENT') {
      node.children.forEach((child) => {
        icons.push(...this.traverseNodes(child));
      });
    }

    return icons;
  }

  /**
   * Export SVG for given node IDs
   */
  async exportSvgs(nodeIds: string[]): Promise<Record<string, string>> {
    const response = await this.api.get(`/images/${this.fileKey}`, {
      params: {
        ids: nodeIds.join(','),
        format: 'svg',
      },
    });

    const imageUrls = response.data.images as Record<string, string>;
    const svgContents: Record<string, string> = {};

    // Download each SVG
    await Promise.all(
      Object.entries(imageUrls).map(async ([nodeId, url]) => {
        if (url) {
          const svgResponse = await axios.get(url);
          svgContents[nodeId] = svgResponse.data;
        }
      })
    );

    return svgContents;
  }

  /**
   * Get all icons with their SVG content
   */
  async getIcons(nodeId?: string, nameFilter?: RegExp): Promise<IconData[]> {
    const nodes = await this.findIconNodes(nodeId);

    // Filter by name if pattern provided
    const filteredNodes = nameFilter
      ? nodes.filter((node) => nameFilter.test(node.name))
      : nodes;

    if (filteredNodes.length === 0) {
      return [];
    }

    // Export all SVGs
    const nodeIds = filteredNodes.map((node) => node.id);
    const svgContents = await this.exportSvgs(nodeIds);

    // Combine node info with SVG content
    const icons: IconData[] = filteredNodes
      .filter((node) => svgContents[node.id])
      .map((node) => ({
        name: node.name, // Keep original name, transformation happens in processor
        originalName: node.name,
        svg: svgContents[node.id],
        nodeId: node.id,
      }));

    return icons;
  }
}
