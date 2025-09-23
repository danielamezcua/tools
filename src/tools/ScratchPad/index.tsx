import '@/styles/globals.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Plus, Trash2, Pencil, Type } from 'lucide-react';

type PageMode = 'text' | 'draw';

type ScratchPage = {
  id: string;
  title: string;
  mode: PageMode;
  // For text mode
  text?: string;
  // For draw mode
  strokes?: Array<Array<{ x: number; y: number }>>;
};

const generateId = () => Math.random().toString(36).slice(2, 10);

const ScratchPad: React.FC = () => {
  const [pages, setPages] = useState<ScratchPage[]>([{
    id: generateId(),
    title: 'Page 1',
    mode: 'text',
    text: ''
  }]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Canvas drawing refs/state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const currentPage = pages[currentIndex];

  const handleAddPage = (mode: PageMode) => {
    const newPage: ScratchPage = mode === 'text'
      ? { id: generateId(), title: `Page ${pages.length + 1}`, mode, text: '' }
      : { id: generateId(), title: `Page ${pages.length + 1}`, mode, strokes: [] };
    const newPages = [...pages.slice(0, currentIndex + 1), newPage, ...pages.slice(currentIndex + 1)];
    setPages(newPages);
    setCurrentIndex(currentIndex + 1);
  };

  const handleDeletePage = () => {
    if (pages.length === 1) return; // keep at least one page
    const newPages = pages.filter((_, i) => i !== currentIndex);
    const newIndex = Math.max(0, currentIndex - 1);
    setPages(newPages);
    setCurrentIndex(newIndex);
  };

  const goPrev = () => setCurrentIndex(i => Math.max(0, i - 1));
  const goNext = () => setCurrentIndex(i => Math.min(pages.length - 1, i + 1));

  const updateTitle = (title: string) => {
    setPages(prev => prev.map((p, i) => i === currentIndex ? { ...p, title } : p));
  };

  const updateText = (text: string) => {
    setPages(prev => prev.map((p, i) => i === currentIndex ? { ...p, text } : p));
  };

  // Drawing handlers for draw mode
  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const ensureStrokeArray = useCallback(() => {
    if (currentPage.mode !== 'draw') return;
    if (!currentPage.strokes) {
      setPages(prev => prev.map((p, i) => i === currentIndex ? { ...p, strokes: [] } : p));
    }
  }, [currentIndex, currentPage.mode, currentPage.strokes]);

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentPage.mode !== 'draw') return;
    ensureStrokeArray();
    const pt = getCanvasPoint(e);
    isDrawingRef.current = true;
    lastPointRef.current = pt;
    setPages(prev => prev.map((p, i) => {
      if (i !== currentIndex) return p;
      const strokes = p.strokes ? [...p.strokes, [pt]] : [[pt]];
      return { ...p, strokes };
    }));
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || currentPage.mode !== 'draw') return;
    const pt = getCanvasPoint(e);
    setPages(prev => prev.map((p, i) => {
      if (i !== currentIndex) return p;
      const strokes = p.strokes ? [...p.strokes] : [];
      if (strokes.length === 0) strokes.push([]);
      strokes[strokes.length - 1] = [...strokes[strokes.length - 1], pt];
      return { ...p, strokes };
    }));
    lastPointRef.current = pt;
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  // Render strokes on canvas when page changes or strokes update
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution to a reasonable size
    const desiredWidth = 1024;
    const desiredHeight = 640;
    canvas.width = desiredWidth;
    canvas.height = desiredHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (currentPage.mode === 'draw' && currentPage.strokes) {
      currentPage.strokes.forEach(stroke => {
        if (stroke.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i++) {
          ctx.lineTo(stroke[i].x, stroke[i].y);
        }
        ctx.stroke();
      });
    }
  }, [currentIndex, currentPage]);

  return (
    <div className="dark flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-3xl flex flex-col max-h-[90vh]">
        <CardHeader className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground text-3xl font-bold">Scratch pad</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goPrev} disabled={currentIndex === 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {pages.length}
              </span>
              <Button variant="outline" size="icon" onClick={goNext} disabled={currentIndex === pages.length - 1}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={currentPage.title}
              onChange={(e) => updateTitle(e.target.value)}
              placeholder="Page title"
              className="flex-1"
            />
            <Button variant="outline" onClick={() => handleAddPage('text')} className="flex items-center gap-1">
              <Type className="h-4 w-4" />
              <span className="hidden sm:inline">Add text</span>
            </Button>
            <Button variant="outline" onClick={() => handleAddPage('draw')} className="flex items-center gap-1">
              <Pencil className="h-4 w-4" />
              <span className="hidden sm:inline">Add draw</span>
            </Button>
            <Button variant="destructive" onClick={handleDeletePage} disabled={pages.length === 1} className="flex items-center gap-1">
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col min-h-0">
          <div className="flex-1 border rounded-md bg-muted overflow-hidden">
            {currentPage.mode === 'text' ? (
              <Textarea
                value={currentPage.text || ''}
                onChange={(e) => updateText(e.target.value)}
                placeholder="Jot your notes here..."
                className="w-full h-[55vh] resize-none bg-muted text-foreground placeholder:text-muted-foreground"
              />
            ) : (
              <div className="w-full h-[55vh]">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={handlePointerUp}
                  onMouseLeave={handlePointerUp}
                  className="w-full h-full bg-background"
                />
              </div>
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
      <ScratchPad />
    </React.StrictMode>
  );
}

export default ScratchPad;

