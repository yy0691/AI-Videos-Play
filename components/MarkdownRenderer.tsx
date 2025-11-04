import React, { useMemo } from 'react';
import { marked } from 'marked';

interface MarkdownRendererProps {
  content: string;
}

// Basic styling for rendered markdown
const markdownStyles = `
  .markdown-content > *:first-child { margin-top: 0; }
  .markdown-content > *:last-child { margin-bottom: 0; }
  .markdown-content ul, .markdown-content ol { padding-left: 1.5rem; margin-top: 0.5rem; margin-bottom: 0.5rem; }
  .markdown-content ul { list-style-type: disc; }
  .markdown-content ol { list-style-type: decimal; }
  .markdown-content li { margin-bottom: 0.25rem; }
  .markdown-content strong { font-weight: 600; }
  .markdown-content pre { background-color: #e5e7eb; padding: 0.75rem; border-radius: 0.375rem; overflow-x: auto; font-family: monospace; font-size: 0.875rem; }
  .markdown-content code { font-family: monospace; background-color: #e5e7eb; padding: 0.125rem 0.25rem; border-radius: 0.25rem; }
  .markdown-content pre code { background-color: transparent; padding: 0; }
  .markdown-content p { margin-bottom: 0.5rem; }
`;

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
    
  const parsedHtml = useMemo(() => {
    // Basic sanitization by configuring marked
    return marked.parse(content, { gfm: true, breaks: true, async: false });
  }, [content]);

  return (
    <>
        <style>{markdownStyles}</style>
        <div 
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: parsedHtml as string }} 
        />
    </>
  );
};

export default MarkdownRenderer;