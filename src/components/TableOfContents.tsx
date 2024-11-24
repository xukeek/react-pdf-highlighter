import React, { useEffect, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import '../style/TableOfContents.css';

interface TableOfContentsProps {
  pdfDocument: PDFDocumentProxy | null;
}

interface OutlineNode {
  title: string;
  dest: any;
  items?: OutlineNode[];
  bold?: boolean;
  italic?: boolean;
  color?: number[];
  expanded?: boolean;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ pdfDocument }) => {
  const [outline, setOutline] = useState<OutlineNode[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadOutline = async () => {
      if (!pdfDocument) return;
      
      try {
        const outline = await pdfDocument.getOutline();
        if (outline) {
          setOutline(outline);
        }
      } catch (error) {
        console.error('Error loading PDF outline:', error);
      }
    };

    loadOutline();
  }, [pdfDocument]);

  const toggleExpand = (title: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  const renderOutlineItem = (item: OutlineNode, level: number = 0) => {
    const hasSubItems = item.items && item.items.length > 0;
    const isExpanded = expandedItems.has(item.title);
    
    return (
      <div key={item.title} style={{ marginLeft: `${level * 20}px` }}>
        <div 
          className="outline-item"
          onClick={() => {
            if (hasSubItems) {
              toggleExpand(item.title);
            }
            if (item.dest) {
              // Handle navigation to the destination
              pdfDocument?.getDestination(item.dest).then(dest => {
                // You can implement custom navigation logic here
                console.log('Navigate to:', dest);
              });
            }
          }}
        >
          {hasSubItems && (
            <span className="expand-icon">
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          <span 
            style={{
              fontWeight: item.bold ? 'bold' : 'normal',
              fontStyle: item.italic ? 'italic' : 'normal',
              color: item.color ? `rgb(${item.color.join(',')})` : 'inherit'
            }}
          >
            {item.title}
          </span>
        </div>
        {hasSubItems && isExpanded && (
          <div className="sub-items">
            {item.items?.map(subItem => renderOutlineItem(subItem, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!outline || outline.length === 0) {
    return <div className="toc-container">No outline available</div>;
  }

  return (
    <div className="toc-container">
      {outline.map(item => renderOutlineItem(item))}
    </div>
  );
};
