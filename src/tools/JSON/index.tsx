import '@/styles/globals.css';
import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, ChevronLeft, ChevronRight, AlertTriangle, PlusCircle, MinusCircle } from 'lucide-react';
import { createRoot } from 'react-dom/client';

type SearchMatch = {
  index: number;
  text: string;
};



type FixResult = {
  fixed: boolean;
  message: string;
};

const isValidUrl = (string: string): boolean => {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
};

const JsonNode = ({ data, level, searchTerm, expanded, toggleExpand, path }) => {
  const isExpanded = expanded.has(path);
  const indent = "ml-4";

  const highlightText = (text) => {
    if (!searchTerm) return text;
    const parts = text.toString().split(new RegExp(`(${searchTerm})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === searchTerm.toLowerCase() ? 
        <span key={i} className="bg-yellow-500 text-black">{part}</span> : 
        part
    );
  };

  // Updated formatValue function to handle URLs
  const formatValue = (value) => {
    if (typeof value === 'string' && isValidUrl(value)) {
      return (
        <a 
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          {highlightText(String(value))}
        </a>
      );
    } else if (typeof value === 'number') {
      return <span className="text-purple-500">{highlightText(String(value))}</span>;
    } else if (typeof value === 'boolean') {
      return <span className="italic text-orange-500">{highlightText(String(value))}</span>;
    }
    return <span className="text-foreground">{highlightText(String(value))}</span>;
  };

  if (Array.isArray(data)) {
    return (
      <div>
        <div className="flex items-center">
          <div className="flex items-center">
            <span className="text-foreground text-lg font-extrabold leading-none">{highlightText("[")}</span>
            <button
              className="inline-flex items-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-1"
              onClick={() => toggleExpand(path)}
            >
              {isExpanded ? 
                <MinusCircle className="h-4 w-4 mr-1" /> : 
                <PlusCircle className="h-4 w-4 mr-1" />
              }
              {data.length}
            </button>
            <span className="text-foreground text-lg font-extrabold leading-none">{"]"}</span>
          </div>
        </div>
        {isExpanded && (
          <div className={indent}>
            {data.map((item, index) => (
              <div key={index} className="flex">
                <span className="text-gray-500 font-semibold">{index}: </span>
                <JsonNode 
                  data={item}
                  level={level + 1}
                  searchTerm={searchTerm}
                  expanded={expanded}
                  toggleExpand={toggleExpand}
                  path={`${path}.${index}`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } else if (typeof data === 'object' && data !== null) {
    return (
      <div>
        <div className="flex items-center">
          <div className="flex items-center">
            <span className="text-foreground text-lg font-extrabold leading-none">{highlightText("{")}</span>
            <button
              className="inline-flex items-center hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-1"
              onClick={() => toggleExpand(path)}
            >
              {isExpanded ? 
                <MinusCircle className="h-4 w-4 mr-1" /> : 
                <PlusCircle className="h-4 w-4 mr-1" />
              }
              {Object.keys(data).length}
            </button>
            <span className="text-foreground text-lg font-extrabold leading-none">{"}"}</span>
          </div>
        </div>
        {isExpanded && (
          <div className={indent}>
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="flex">
                <span className="text-foreground font-black">{highlightText(key)}: </span>
                <JsonNode 
                  data={value}
                  level={level + 1}
                  searchTerm={searchTerm}
                  expanded={expanded}
                  toggleExpand={toggleExpand}
                  path={`${path}.${key}`}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  
  return formatValue(data);
};


const JSONViewer: React.FC = () => {
  const [inputJson, setInputJson] = useState<string>('');
  const [parsedJson, setParsedJson] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentMatch, setCurrentMatch] = useState<number>(0);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [fixResults, setFixResults] = useState<FixResult[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fixJson = (input: string): { text: string; fixes: FixResult[]; errorPosition?: number } => {
    let text = input;
    const fixes: FixResult[] = [];
    let errorPosition: number | undefined;

    // Try to parse to get error position if any
    try {
        JSON.parse(text);
    } catch (e) {
        const error = e as SyntaxError;
        const match = error.message.match(/position (\d+)/);
        if (match) {
        errorPosition = parseInt(match[1]);
        }
    }

    // Fix quotes - handles both key and value quotes
    const fixQuotes = (str: string): string => {
        let result = str;
        let quoteFixed = false;

        // Fix keys with single quotes
        const keyRegex = /'([^']+)'(?=\s*:)/g;
        if (keyRegex.test(result)) {
        result = result.replace(keyRegex, '"$1"');
        quoteFixed = true;
        }

        // Fix values with single quotes
        const valueRegex = /:\s*'([^']+)'/g;
        if (valueRegex.test(result)) {
        result = result.replace(valueRegex, ': "$1"');
        quoteFixed = true;
        }

        // Fix array values with single quotes
        const arrayRegex = /\[\s*'([^']+)'(?=[,\]])/g;
        if (arrayRegex.test(result)) {
        result = result.replace(arrayRegex, '["$1"');
        quoteFixed = true;
        }

        // Fix comma-separated values with single quotes
        const commaValueRegex = /,\s*'([^']+)'(?=[,\]])/g;
        if (commaValueRegex.test(result)) {
        result = result.replace(commaValueRegex, ',"$1"');
        quoteFixed = true;
        }

        if (quoteFixed) {
        fixes.push({
            fixed: true,
            message: "Replaced incorrect quotes with double quotes"
        });
        }

        return result;
    };

    // Fix boolean values
    const fixBooleans = (str: string): string => {
        let result = str;
        let boolFixed = false;

        // Fix casing for quoted boolean values
        const quotedBoolRegex = /:\s*"(true|false|True|False|TRUE|FALSE)"(?=[,}\]]|$)/g;
        if (quotedBoolRegex.test(result)) {
        result = result.replace(quotedBoolRegex, (match) => {
            boolFixed = true;
            return match.toLowerCase();
        });
        }

        // Fix unquoted boolean values
        const unquotedBoolRegex = /:\s*(true|false|True|False|TRUE|FALSE)(?=[,}\]]|$)/g;
        if (unquotedBoolRegex.test(result)) {
        result = result.replace(unquotedBoolRegex, (match) => {
            boolFixed = true;
            return match.toLowerCase();
        });
        }

        if (boolFixed) {
        fixes.push({
            fixed: true,
            message: "Converted boolean values to lowercase"
        });
        }

        return result;
    };

    // Apply fixes in sequence
    text = fixQuotes(text);
    text = fixBooleans(text);

    return { text, fixes, errorPosition };
    };
    
  const parseJson = useCallback(() => {
    try {
      if (!inputJson.trim()) {
        setParsedJson(null);
        setError('');
        setFixResults([]);
        return;
      }

      // Try to parse as-is first
      try {
        const parsed = JSON.parse(inputJson);
        setParsedJson(parsed);
        setError('');
        setFixResults([]);
        return;
      } catch {
        // If parsing fails, try to fix and parse again
        const { text, fixes } = fixJson(inputJson);
        if (fixes.length > 0) {
          const parsed = JSON.parse(text);
          setParsedJson(parsed);
          setError('');
          setFixResults(fixes);
          setInputJson(text); // Update the input with fixed JSON
        } else {
          throw new Error("Invalid JSON and couldn't be automatically fixed");
        }
      }
    } catch (e) {
      setError((e as Error).message);
      setParsedJson(null);
      setFixResults([]);
    }
  }, [inputJson]);

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpanded(newExpanded);
  };

  const expandAll = () => {
    const newExpanded = new Set<string>();
    const addAllPaths = (obj: any, path: string = '') => {
      if (typeof obj !== 'object' || obj === null) return;
      newExpanded.add(path);
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => addAllPaths(item, `${path}.${index}`));
      } else {
        Object.entries(obj).forEach(([key, value]) => addAllPaths(value, `${path}.${key}`));
      }
    };
    addAllPaths(parsedJson);
    setExpanded(newExpanded);
  };

  const collapseAll = () => {
    setExpanded(new Set());
  };

  const navigateSearch = (direction: 'next' | 'prev') => {
    if (matches.length === 0) return;
    if (direction === 'next') {
      setCurrentMatch((prev) => (prev + 1) % matches.length);
    } else {
      setCurrentMatch((prev) => (prev - 1 + matches.length) % matches.length);
    }
  };

 return (
    <div className="dark flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-3xl flex flex-col max-h-[90vh]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground text-3xl font-bold">JSON viewer</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="pl-8 pr-4 py-1 rounded border dark:bg-gray-800 dark:border-gray-700"
              />
              {matches.length > 0 && (
                <div className="flex items-center ml-2 space-x-2">
                  <span className="text-sm">
                    {currentMatch + 1}/{matches.length}
                  </span>
                  <button
                    onClick={() => navigateSearch('prev')}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigateSearch('next')}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col min-h-0">

          {/* Rest of the component remains the same */}
          <textarea
            ref={textareaRef}
            value={inputJson}
            onChange={(e) => setInputJson(e.target.value)}
            onBlur={parseJson}
            placeholder="Paste your JSON here..."
            className="w-full h-40 p-2 mb-4 font-mono text-sm border rounded resize-none dark:bg-gray-800 dark:border-gray-700"
          />
          {fixResults.length > 0 && (
            <div className="mb-4 p-4 bg-blue-100 dark:bg-blue-900 rounded">
              <div className="flex items-center space-x-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">Automatic fixes applied:</span>
              </div>
              <ul className="list-disc list-inside">
                {fixResults.map((result, index) => (
                  <li key={index} className="text-sm">
                    {result.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="overflow-auto flex-1 font-mono text-sm">
            {parsedJson && (
              <JsonNode
                data={parsedJson}
                level={0}
                searchTerm={searchTerm}
                expanded={expanded}
                toggleExpand={toggleExpand}
                path="root"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <JSONViewer />
        </React.StrictMode>
    );
}

export default JSONViewer;