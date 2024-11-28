import React, { useState, useEffect, useCallback, useRef } from "react";

import {
  AreaHighlight,
  Highlight,
  PdfHighlighter,
  PdfLoader,
  Popup,
  Tip,
} from "./react-pdf-highlighter";
import type {
  Content,
  IHighlight,
  NewHighlight,
  ScaledPosition,
} from "./react-pdf-highlighter";

import { Sidebar } from "./Sidebar";
import { Spinner } from "./Spinner";
import { testHighlights as _testHighlights } from "./test-highlights";

import "./style/App.css";
import "../../dist/style.css";

const testHighlights: Record<string, Array<IHighlight>> = _testHighlights;

const getNextId = () => String(Math.random()).slice(2);

const parseIdFromHash = () =>
  document.location.hash.slice("#highlight-".length);

const resetHash = () => {
  document.location.hash = "";
};

const HighlightPopup = ({
  comment,
}: {
  comment: { text: string; emoji: string };
}) =>
  comment.text ? (
    <div className="Highlight__popup">
      {comment.emoji} {comment.text}
    </div>
  ) : null;

const PRIMARY_PDF_URL = "https://arxiv.org/pdf/1708.08021";
const SECONDARY_PDF_URL = "https://arxiv.org/pdf/1604.02480";

const searchParams = new URLSearchParams(document.location.search);
const initialUrl = searchParams.get("url") || PRIMARY_PDF_URL;

export function App() {
  const [url, setUrl] = useState(initialUrl);
  const [highlights, setHighlights] = useState<Array<IHighlight>>(
    testHighlights[initialUrl] ? [...testHighlights[initialUrl]] : []
  );

  const resetHighlights = () => {
    setHighlights([]);
  };

  const toggleDocument = () => {
    const newUrl =
      url === PRIMARY_PDF_URL ? SECONDARY_PDF_URL : PRIMARY_PDF_URL;
    setUrl(newUrl);
    setHighlights(testHighlights[newUrl] ? [...testHighlights[newUrl]] : []);
  };

  const scrollViewerTo = useRef((highlight: IHighlight) => {
    // Implement scrolling logic here
  });

  const scrollToHighlightFromHash = useCallback(() => {
    const highlight = getHighlightById(parseIdFromHash());
    if (highlight) {
      scrollViewerTo.current(highlight);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("hashchange", scrollToHighlightFromHash, false);
    return () => {
      window.removeEventListener(
        "hashchange",
        scrollToHighlightFromHash,
        false
      );
    };
  }, [scrollToHighlightFromHash]);

  const getHighlightById = (id: string) => {
    return highlights.find((highlight) => highlight.id === id);
  };

  const addHighlight = (highlight: NewHighlight) => {
    console.log("Saving highlight", highlight);
    setHighlights((prevHighlights) => [
      { ...highlight, id: getNextId() },
      ...prevHighlights,
    ]);
  };

  const updateHighlight = (
    highlightId: string,
    position: Partial<ScaledPosition>,
    content: Partial<Content>
  ) => {
    console.log("Updating highlight", highlightId, position, content);
    setHighlights((prevHighlights) =>
      prevHighlights.map((h) => {
        const {
          id,
          position: originalPosition,
          content: originalContent,
          ...rest
        } = h;
        return id === highlightId
          ? {
              id,
              position: { ...originalPosition, ...position },
              content: { ...originalContent, ...content },
              ...rest,
            }
          : h;
      })
    );
  };

  const pdfNavigator = {
    goToPage: (page: number) => {},
    nextPage: () => {},
    previousPage: () => {},
  };

  return (
    <div className="App" style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        highlights={highlights}
        resetHighlights={resetHighlights}
        toggleDocument={toggleDocument}
      >
        <div style={{ padding: "1rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <button
              onClick={() => pdfNavigator.previousPage()}
              style={{
                marginRight: "0.5rem",
                padding: "0.5rem 1rem",
                cursor: "pointer",
              }}
            >
              Previous Page
            </button>
            <button
              onClick={() => pdfNavigator.nextPage()}
              style={{
                marginRight: "0.5rem",
                padding: "0.5rem 1rem",
                cursor: "pointer",
              }}
            >
              Next Page
            </button>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <input
              type="number"
              min="1"
              onChange={(e) => {
                const page = parseInt(e.target.value, 10);
                if (!isNaN(page)) {
                  pdfNavigator.goToPage(page);
                }
              }}
              style={{
                width: "60px",
                marginRight: "0.5rem",
                padding: "0.5rem",
              }}
              placeholder="Page"
            />
            <button
              onClick={(e) => {
                const input = e.currentTarget
                  .previousElementSibling as HTMLInputElement;
                const page = parseInt(input.value, 10);
                if (!isNaN(page)) {
                  pdfNavigator.goToPage(page);
                }
              }}
              style={{
                padding: "0.5rem 1rem",
                cursor: "pointer",
              }}
            >
              Go to Page
            </button>
          </div>
        </div>
      </Sidebar>
      <div
        style={{
          height: "100vh",
          width: "75vw",
          position: "relative",
        }}
      >
        <PdfLoader url={url} beforeLoad={<Spinner />}>
          {(pdfDocument) => (
            <PdfHighlighter
              pdfDocument={pdfDocument}
              enableAreaSelection={(event) => event.altKey}
              onScrollChange={resetHash}
              onPageChange={(page) => {
                console.log("onPageChange", page);
              }}
              pdfNavigator={pdfNavigator}
              scrollRef={(scrollTo) => {
                scrollViewerTo.current = scrollTo;
                scrollToHighlightFromHash();
              }}
              onSelectionFinished={(
                position,
                content,
                hideTipAndSelection,
                transformSelection
              ) => (
                <Tip
                  onOpen={transformSelection}
                  onConfirm={(comment) => {
                    addHighlight({ content, position, comment });
                    hideTipAndSelection();
                  }}
                />
              )}
              highlightTransform={(
                highlight,
                index,
                setTip,
                hideTip,
                viewportToScaled,
                screenshot,
                isScrolledTo
              ) => {
                const isTextHighlight = !highlight.content?.image;

                const component = isTextHighlight ? (
                  <Highlight
                    isScrolledTo={isScrolledTo}
                    position={highlight.position}
                    comment={highlight.comment}
                  />
                ) : (
                  <AreaHighlight
                    isScrolledTo={isScrolledTo}
                    highlight={highlight}
                    onChange={(boundingRect) => {
                      updateHighlight(
                        highlight.id,
                        { boundingRect: viewportToScaled(boundingRect) },
                        { image: screenshot(boundingRect) }
                      );
                    }}
                  />
                );

                return (
                  <Popup
                    popupContent={<HighlightPopup {...highlight} />}
                    onMouseOver={(popupContent) =>
                      setTip(highlight, (highlight) => popupContent)
                    }
                    onMouseOut={hideTip}
                    key={index}
                  >
                    {component}
                  </Popup>
                );
              }}
              highlights={highlights}
            />
          )}
        </PdfLoader>
      </div>
    </div>
  );
}
