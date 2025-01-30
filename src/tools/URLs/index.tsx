import '@/styles/globals.css';
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Copy, ExternalLink, ArrowUpDown, Eraser } from 'lucide-react';
import { createRoot } from 'react-dom/client';
interface URLItem {
  url: string;
  count: number;
}

const URLExtractor = () => {
  const [inputText, setInputText] = useState<string>('');
  const [urls, setUrls] = useState<URLItem[]>([]);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortAscending, setSortAscending] = useState<boolean>(true);

  useEffect(() => {
    extractUrls();
  }, [inputText, sortAscending]);

  const extractUrls = () => {
    try {
      const urlRegex = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/g;
      const matches = inputText.match(urlRegex);
      
      if (!matches) {
        setUrls([]);
        setError(inputText.trim() ? 'No URLs found in the text.' : '');
        return;
      }

      const urlCounts = matches.reduce<Record<string, number>>((acc, url) => {
        acc[url] = (acc[url] || 0) + 1;
        return acc;
      }, {});

      const urlItems = Object.entries(urlCounts)
        .map(([url, count]) => ({ url, count }))
        .sort((a, b) => {
          if (sortAscending) {
            return a.url.toLowerCase().localeCompare(b.url.toLowerCase());
          }
          return b.url.toLowerCase().localeCompare(a.url.toLowerCase());
        });

      setUrls(urlItems);
      setError('');
    } catch (err) {
      setError('Error processing text. Please try again.');
      setUrls([]);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClear = () => {
    setInputText('');
    setUrls([]);
    setError('');
    setSearchQuery('');
  };

  const filteredUrls = urls.filter(item => 
    item.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dark flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-3xl flex flex-col max-h-[90vh]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground text-3xl font-bold">URL extractor</CardTitle>
          <Button 
            variant="outline" 
            size="default"
            onClick={handleClear}
            className="flex items-center gap-2"
          >
            <Eraser className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col min-h-0">
          <div className="w-full mb-4">
            <Textarea
              placeholder="Paste your text here..."
              className="w-full h-32 resize-none bg-muted text-foreground placeholder:text-muted-foreground"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {urls.length > 0 && (
            <div className="flex flex-col min-h-0">
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Search URLs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => setSortAscending(!sortAscending)}
                  className="flex-shrink-0 flex items-center gap-2"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  {sortAscending ? "A → Z" : "Z → A"}
                </Button>
              </div>
              
              <div className="border rounded-md overflow-y-auto max-h-[50vh] ">
                <div className="p-2 space-y-1">
                  {filteredUrls.map(({ url, count }, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded hover:bg-accent group"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm font-mono truncate text-foreground">
                          {url}
                        </span>
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full whitespace-nowrap">
                          {count}×
                        </span>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(url)}
                          className="h-8 w-8 p-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(url, '_blank')}
                          className="h-8 w-8 p-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
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
            <URLExtractor />
        </React.StrictMode>
    );
}

export default URLExtractor;