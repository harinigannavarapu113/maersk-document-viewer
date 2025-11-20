
import React, { useRef, useState, useEffect, useCallback } from "react";


import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;


export default function App() {
  const pdfPath = "/Maersk-Q2-2025-Interim-Report.pdf";

  const iframeRef = useRef(null);
  const viewerRef = useRef(null);
  const hideTimeoutRef = useRef(null);


  const [activeRef, setActiveRef] = useState(null); // 'p3' | 'p5' | 'p15' | null
  const [highlightActive, setHighlightActive] = useState(false);
  const [overlayStyle, setOverlayStyle] = useState(null);
  const [pinned, setPinned] = useState(false);
   // eslint-disable-next-line
  const [manualShiftPx, setManualShiftPx] = useState(0);

  
  const defaultBoxes = {
    p3:  { topPct: 0.32, leftPct: 0.29, widthPct: 0.56, heightPx: 50, borderRadius: 6, label: "[1]" },
    p5:  { topPct: 0.39, leftPct: 0.29, widthPct: 0.56, heightPx: 50, borderRadius: 6, label: "[2]" },
    p15: { topPct: 0.47, leftPct: 0.29, widthPct: 0.56, heightPx: 50, borderRadius: 6, label: "[3]" },
  };
  // eslint-disable-next-line
  const [highlightBoxes, setHighlightBoxes] = useState(defaultBoxes);

  const BADGES = {
    p3: { excerpt: "EBITDA of USD 2.3 bn (USD 2.1 bn) driven by volume & operational improvements. (Page 3)" },
    p5: { excerpt: "EBITDA increased to USD 2.3 bn — revenue growth and cost control across segments. (Page 5)" },
    p15: { excerpt: "Gain on sale of non-current assets, net: 25 (208) — reported below EBITDA (Page 15)." },
  };

 
  const applyManualShift = useCallback((style) => {
    if (!style) return style;
    const left = typeof style.left === "number" ? style.left : parseInt(style.left || 0, 10) || 0;
    return { ...style, left: left + Number(manualShiftPx) };
  }, [manualShiftPx]);

 
  const computeOverlayStyle = useCallback((box) => {
    const viewerEl = viewerRef.current;
    const iframeEl = iframeRef.current;
    if (!viewerEl || !iframeEl || !box) return null;

    const viewerRect = viewerEl.getBoundingClientRect();
    const iframeRect = iframeEl.getBoundingClientRect();

    const offsetTop = Math.round(iframeRect.top - viewerRect.top);
    const offsetLeft = Math.round(iframeRect.left - viewerRect.left);

    const contentWidth = Math.round(iframeRect.width);
    const contentHeight = Math.round(iframeRect.height);

    const topPx = Math.round(offsetTop + contentHeight * box.topPct);
    const leftPx = Math.round(offsetLeft + contentWidth * box.leftPct);
    const widthPx = Math.round(contentWidth * box.widthPct);
    const heightPx = Math.round(box.heightPx);

    const clampedLeft = Math.max(0, Math.min(leftPx, viewerEl.clientWidth - 8));
    const clampedTop = Math.max(0, Math.min(topPx, viewerEl.clientHeight - 8));
    const clampedWidth = Math.max(8, Math.min(widthPx, viewerEl.clientWidth - clampedLeft));
    const clampedHeight = Math.max(8, Math.min(heightPx, viewerEl.clientHeight - clampedTop));

    return {
      position: "absolute",
      top: clampedTop,
      left: clampedLeft,
      width: clampedWidth,
      height: clampedHeight,
      backgroundColor: "rgba(255,235,59,0.65)",
      borderRadius: box.borderRadius,
      boxShadow: "0 0 0 2px rgba(255,235,59,0.95) inset",
      zIndex: 9999,
      pointerEvents: "none",
    };
  }, []);

  
  const autoDetectOverlay = useCallback(
    async (refKey, boxConfig) => {
      const viewerEl = viewerRef.current;
      const iframeEl = iframeRef.current;
      if (!viewerEl || !iframeEl || !boxConfig || !refKey) return null;

      try {
        const loadingTask = pdfjsLib.getDocument(pdfPath);
        const pdf = await loadingTask.promise;

        const pageNumber = refKey === "p3" ? 3 : refKey === "p5" ? 5 : 15;
        const page = await pdf.getPage(pageNumber);

        const viewport = page.getViewport({ scale: 1 });
        const pdfWidth = viewport.width;
        const pdfHeight = viewport.height;

        const viewerRect = viewerEl.getBoundingClientRect();
        const iframeRect = iframeEl.getBoundingClientRect();

        
        const availableWidth = Math.max(8, Math.floor(iframeRect.width));
        const availableHeight = Math.max(8, Math.floor(iframeRect.height));

        let scale = availableHeight / pdfHeight;
        if (pdfWidth * scale > availableWidth) scale = availableWidth / pdfWidth;

        const renderedPageWidth = Math.round(pdfWidth * scale);
        const renderedPageHeight = Math.round(pdfHeight * scale);

        const pageLeftInsideIframe = Math.round((availableWidth - renderedPageWidth) / 2);
        const pageTopInsideIframe = Math.round((availableHeight - renderedPageHeight) / 2);

        const iframeOffsetTop = Math.round(iframeRect.top - viewerRect.top);
        const iframeOffsetLeft = Math.round(iframeRect.left - viewerRect.left);

        const pageLeftInViewer = iframeOffsetLeft + pageLeftInsideIframe;
        const pageTopInViewer = iframeOffsetTop + pageTopInsideIframe;

        const topPx = Math.round(pageTopInViewer + renderedPageHeight * boxConfig.topPct);
        const leftPx = Math.round(pageLeftInViewer + renderedPageWidth * boxConfig.leftPct);
        const widthPx = Math.round(renderedPageWidth * boxConfig.widthPct);
        const heightPx = Math.round(boxConfig.heightPx);

        const clampedLeft = Math.max(0, Math.min(leftPx, viewerEl.clientWidth - 8));
        const clampedTop = Math.max(0, Math.min(topPx, viewerEl.clientHeight - 8));
        const clampedWidth = Math.max(8, Math.min(widthPx, viewerEl.clientWidth - clampedLeft));
        const clampedHeight = Math.max(8, Math.min(heightPx, viewerEl.clientHeight - clampedTop));

        return {
          position: "absolute",
          top: clampedTop,
          left: clampedLeft,
          width: clampedWidth,
          height: clampedHeight,
          backgroundColor: "rgba(255,235,59,0.65)",
          borderRadius: boxConfig.borderRadius || 6,
          boxShadow: "0 0 0 2px rgba(255,235,59,0.95) inset",
          zIndex: 9999,
          pointerEvents: "none",
        };
      } catch (err) {
        // console.warn("autoDetectOverlay error:", err);
        return null;
      }
    },
    [pdfPath]
  );

  

  useEffect(() => {
    let cancelled = false;
    if (!activeRef) {
      setOverlayStyle(null);
      return;
    }

    (async () => {
      const auto = await autoDetectOverlay(activeRef, highlightBoxes[activeRef]);
      if (cancelled) return;
      if (auto) {
        setOverlayStyle(applyManualShift(auto));
        return;
      }

      const newStyle = computeOverlayStyle(highlightBoxes[activeRef]);
      if (newStyle) {
        setOverlayStyle(applyManualShift(newStyle));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeRef, highlightBoxes, computeOverlayStyle, autoDetectOverlay, applyManualShift]);

 
  useEffect(() => {
    let rafId = null;
    const onLayoutChange = () => {
      if (!activeRef) return;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(async () => {
        const auto = await autoDetectOverlay(activeRef, highlightBoxes[activeRef]);
        if (auto) setOverlayStyle(applyManualShift(auto));
        else {
          const heuristic = computeOverlayStyle(highlightBoxes[activeRef]);
          if (heuristic) setOverlayStyle(applyManualShift(heuristic));
        }
      });
    };

    window.addEventListener("resize", onLayoutChange);
    window.addEventListener("scroll", onLayoutChange, true);

    return () => {
      window.removeEventListener("resize", onLayoutChange);
      window.removeEventListener("scroll", onLayoutChange, true);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [activeRef, autoDetectOverlay, computeOverlayStyle, highlightBoxes, applyManualShift]);


  useEffect(() => {
    const iframeEl = iframeRef.current;
    if (!iframeEl) return;

    const onLoad = () => {
      setTimeout(async () => {
        if (!activeRef) return;

        const auto = await autoDetectOverlay(activeRef, highlightBoxes[activeRef]);
        if (auto) {
          setOverlayStyle(applyManualShift(auto));
          setHighlightActive(false);
        } else {
          const fallback = computeOverlayStyle(highlightBoxes[activeRef]);
          if (fallback) {
            setOverlayStyle(applyManualShift(fallback));
            setHighlightActive(false);
          }
        }
      }, 120);

      
      if (!pinned && activeRef) {
        if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = setTimeout(() => {
          setHighlightActive((prev) => {
            if (pinned) return prev;
            return false;
          });
          hideTimeoutRef.current = null;
        }, 4500);
      }
    };

    iframeEl.addEventListener("load", onLoad);
    return () => iframeEl.removeEventListener("load", onLoad);
  }, [activeRef, autoDetectOverlay, computeOverlayStyle, highlightBoxes, pinned, applyManualShift]);


  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  

   const showAndHighlightText = ({ refKey, searchTerm, openInNewTab = false, persistent = false }) => {
   if (!refKey) return;
   const pageNumber = refKey === "p3" ? 3 : refKey === "p5" ? 5 : 15;
   const target = pdfPath + `?t=${Date.now()}#page=${pageNumber}`;

   if (openInNewTab) window.open(target, "_blank");
  else if (iframeRef.current) iframeRef.current.src = target;
  else window.open(target, "_blank");


  setActiveRef(null);
  setOverlayStyle(null);
  setHighlightActive(false);

  // clear timer
  if (hideTimeoutRef.current) {
    clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = null;
  }

  if (typeof persistent === "boolean") setPinned(Boolean(persistent));
  };


  const AnalysisPanel = ({ onCite }) => {
    const Cite = ({ id, snippet }) => (
      <button
        onClick={() => onCite({ refKey: id, searchTerm: snippet })}
        style={{
          display: "inline-block",
          marginLeft: 6,
          marginRight: 2,
          background: "#facc15",
          borderRadius: 4,
          padding: "2px 6px",
          border: "none",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: 12,
        }}
      >
        {id === "p3" ? "[1]" : id === "p5" ? "[2]" : "[3]"}
      </button>
    );

    return (
      <div style={{ ...styles.panelContent }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: "#fff" }}>Analysis</div>

        <div style={{ fontSize: 13, color: "#fff", lineHeight: 1.4, marginBottom: 10 }}>
          <div>No extraordinary or one-off items affecting EBITDA were reported in Maersk’s Q2 2025 results.</div>

          <div style={{ marginTop: 8 }}>
            EBITDA improvements were driven by core operational performance — including volume growth, cost control,
            and margin improvement across Ocean, Logistics &amp; Services, and Terminals segments
            <span style={{ marginLeft: 6 }} />
            <Cite id="p3" snippet={"EBITDA of USD 2.3"} />
            <Cite id="p5" snippet={"EBITDA increased to USD 2.3"} />
          </div>

          <div style={{ marginTop: 10 }}>
            Gains or losses from asset sales are reported <strong>below EBITDA</strong> in the Condensed Income Statement
            and therefore do <strong>not</strong> affect EBITDA. The gain on sale of non-current assets amounted to USD
            25m in Q2 2025 (USD 208m in Q2 2024) and affects <strong>EBIT</strong>, not EBITDA
            <span style={{ marginLeft: 6 }} />
            <Cite id="p15" snippet={"Gain on sale of non-current assets USD 25m"} />
            .
          </div>

          <div style={{ marginTop: 10 }}>
            Hence, Q2 2025 EBITDA reflects underlying operating activities without one-off adjustments.
          </div>
        </div>

        <div style={{ fontWeight: 700, marginTop: 8, color: "#fff" }}>Findings</div>

        <div style={{ marginTop: 8, fontSize: 13, color: "#fff", lineHeight: 1.45 }}>
          <div>
            <strong>Page 3 — Highlights Q2 2025</strong>
          </div>
          <div style={{ marginLeft: 8 }}>
            EBITDA increase (USD 2.3 bn vs USD 2.1 bn prior year) attributed to operational improvements; no mention of
            extraordinary or one-off items.
            <Cite id="p3" snippet={"EBITDA of USD 2.3"} />
          </div>

          <div style={{ marginTop: 10 }}>
            <strong>Page 5 — Review Q2 2025</strong>
          </div>
          <div style={{ marginLeft: 8 }}>
            EBITDA rise driven by higher revenue and cost control across all segments; no extraordinary gains or losses
            included.
            <Cite id="p5" snippet={"EBITDA increased to USD 2.3"} />
          </div>

          <div style={{ marginTop: 10 }}>
            <strong>Page 15 — Condensed Income Statement</strong>
          </div>
          <div style={{ marginLeft: 8 }}>
            Gain on sale of non-current assets USD 25m (vs USD 208m prior year) is reported below EBITDA; therefore, not
            part of EBITDA.
            <Cite id="p15" snippet={"Gain on sale of non-current assets USD 25m"} />
          </div>
        </div>
      </div>
    );
  };


  return (
    <div style={styles.app}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h1 style={{ margin: 0, fontSize: 28 }}>Maersk Q2 2025 — PDF Viewer</h1>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <label style={{ fontSize: 15 }}>Zoom</label>
            <input type="range" min="0.6" max="2" step="0.05" defaultValue={1} onChange={() => {}} style={{ width: 160 }} />
          </div>

          <div style={{ display: "flex", gap: 8, marginLeft: 12 }}>
            <button style={styles.pillButton} onClick={() => showAndHighlightText({ refKey: "p3", searchTerm: "EBITDA of USD 2.3" })}>
              [1] Page 3
            </button>
            <button style={styles.pillButton} onClick={() => showAndHighlightText({ refKey: "p5", searchTerm: "EBITDA increased to USD 2.3" })}>
              [2] Page 5
            </button>
            <button style={styles.pillButton} onClick={() => showAndHighlightText({ refKey: "p15", searchTerm: "Gain on sale of non-current assets USD 25m" })}>
              [3] Page 15
            </button>
          </div>
        </div>
      </div>

      <div style={styles.container}>
        {/* Viewer column */}
        <div style={styles.viewerColumn}>
          <div style={styles.controls}>
            <div style={{ marginLeft: 12, color: "#d00", fontSize: 13 }} />
          </div>

          <div ref={viewerRef} style={styles.viewerBox}>
            {/* Overlay */}
            {highlightActive && overlayStyle && activeRef && (
              <>
                <div aria-hidden style={overlayStyle} />

                {/* Badge + excerpt to overlay's right */}
                <div
                  style={{
                    position: "absolute",
                    top: (overlayStyle.top || 0) - 6,
                    left: (overlayStyle.left || 0) + (overlayStyle.width || 0) + 8,
                    maxWidth: 360,
                    zIndex: 10000,
                    pointerEvents: "none",
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    transform: "translateY(-4px)",
                  }}
                >
                  <div
                    style={{
                      background: "#f59e0b",
                      color: "#000",
                      fontWeight: 700,
                      padding: "4px 6px",
                      borderRadius: 6,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                      fontSize: 13,
                    }}
                  >
                    {highlightBoxes[activeRef]?.label || ""}
                  </div>

                  <div
                    style={{
                      background: "rgba(255,255,255,0.95)",
                      padding: "6px 8px",
                      borderRadius: 6,
                      fontSize: 12,
                      color: "#111",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      maxWidth: 320,
                      pointerEvents: "none",
                    }}
                  >
                    {BADGES[activeRef]?.excerpt}
                  </div>
                </div>
              </>
            )}

            <iframe id="pdf-frame" ref={iframeRef} title="Maersk Q2 2025" src={pdfPath + "#page=1"} style={styles.iframe} />
          </div>

          {/* Live tuner */}
          <div style={{ marginTop: 10 }}>
            

                  
                
              
            </div>
          
        </div>

        {/* Right: Analysis panel */}
        <aside style={styles.panel}>
          <div style={styles.panelInner}>
            <AnalysisPanel onCite={({ refKey, searchTerm }) => showAndHighlightText({ refKey, searchTerm })} />

            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button style={styles.button} onClick={() => showAndHighlightText({ refKey: "p3", searchTerm: "EBITDA of USD 2.3" })}>
                Jump to Page 3 [1]
              </button>
              <button style={styles.button} onClick={() => showAndHighlightText({ refKey: "p5", searchTerm: "EBITDA increased to USD 2.3" })}>
                Jump to Page 5 [2]
              </button>
              <button style={styles.button} onClick={() => showAndHighlightText({ refKey: "p15", searchTerm: "Gain on sale of non-current assets USD 25m" })}>
                Jump to Page 15 [3]
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: "#ccc" }}>
              Note: overlay is positioned relative to the viewer container. If the yellow box is slightly off, select the page under "Tune highlight", then adjust Top / Left / Width / Height sliders until it matches.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* Styles */
const styles = {
  app: {
    padding: 18,
    fontFamily: "Inter, Arial, sans-serif",
    background: "#fafafa",
    height: "100vh",
    boxSizing: "border-box",
  },
  container: {
    display: "flex",
    gap: 18,
    alignItems: "flex-start",
  },
  viewerColumn: {
    flex: 2,
    minWidth: 640,
  },
  controls: {
    padding: "8px 0",
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  viewerBox: {
    position: "relative",
    height: "64vh",
    minHeight: 560,
    background: "#fff",
    border: "1px solid #e5e7eb",
    padding: 8,
    boxSizing: "border-box",
    overflow: "hidden",
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: "none",
  },
  panel: {
    flex: 1,
    minWidth: 340,
    padding: 12,
  },
  panelInner: {
    background: "#000", // BLACK background
    borderRadius: 8,
    padding: 12,
    border: "1px solid #333",
    maxHeight: "78vh",
    overflowY: "auto",
    color: "#fff", // WHITE text default
  },
  panelContent: {
    whiteSpace: "pre-wrap",
    color: "#fff", // white text
  },
  button: {
    display: "inline-block",
    marginTop: 8,
    padding: "10px 12px",
    background: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 700,
  },
  smallButton: {
    padding: "8px 10px",
    background: "#facc15",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 700,
  },
  pillButton: {
    background: "#fff",
    color: "#111",
    border: "none",
    borderRadius: 8,
    padding: "8px 12px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 2px 0 rgba(0,0,0,0.08)",
  },
};
