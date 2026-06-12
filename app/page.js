"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "random-pair-picker-state";
const SPIN_DURATION_MS = 2000;
const EMPTY_ARRAY = [];

function normalizeNames(text) {
  const seen = new Set();
  const duplicates = new Set();
  const names = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const name = rawLine.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) {
      duplicates.add(name);
      continue;
    }
    seen.add(key);
    names.push(name);
  }

  return { names, duplicates: [...duplicates] };
}

function shuffleArray(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildCsv(matches) {
  const rows = [["Number", "Group A", "Group B"]];
  for (const match of matches) {
    rows.push([
      String(match.number),
      `"${String(match.groupA).replaceAll('"', '""')}"`,
      `"${String(match.groupB).replaceAll('"', '""')}"`,
    ]);
  }
  return rows.map((row) => row.join(",")).join("\n");
}

function getRemainingB(allB, matches) {
  const matched = new Set(matches.map((match) => match.groupB.toLowerCase()));
  return allB.filter((name) => !matched.has(name.toLowerCase()));
}

function buildValidationMessage(groupA, groupB) {
  const parts = [];
  if (groupA.names.length !== groupB.names.length) {
    parts.push(
      `Counts differ. Matching will stop after ${Math.min(
        groupA.names.length,
        groupB.names.length
      )} pairs.`
    );
  }
  if (groupA.duplicates.length) {
    parts.push(`Group A deduplicated: ${groupA.duplicates.join(", ")}.`);
  }
  if (groupB.duplicates.length) {
    parts.push(`Group B deduplicated: ${groupB.duplicates.join(", ")}.`);
  }
  return parts.join(" ");
}

export default function Page() {
  const [groupAInput, setGroupAInput] = useState("");
  const [groupBInput, setGroupBInput] = useState("");
  const [shuffleGroupA, setShuffleGroupA] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [groupAOrder, setGroupAOrder] = useState(EMPTY_ARRAY);
  const [currentAIndex, setCurrentAIndex] = useState(0);
  const [matches, setMatches] = useState(EMPTY_ARRAY);
  const [selectedB, setSelectedB] = useState("");
  const [spinDisplay, setSpinDisplay] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [loaded, setLoaded] = useState(false);
  const spinTimerRef = useRef(null);
  const spinIntervalRef = useRef(null);

  const parsedA = useMemo(() => normalizeNames(groupAInput), [groupAInput]);
  const parsedB = useMemo(() => normalizeNames(groupBInput), [groupBInput]);
  const validationMessage = useMemo(
    () => buildValidationMessage(parsedA, parsedB),
    [parsedA, parsedB]
  );
  const remainingB = useMemo(
    () => getRemainingB(parsedB.names, matches),
    [parsedB.names, matches]
  );

  const totalAvailableMatches = Math.min(groupAOrder.length, parsedB.names.length);
  const isComplete = sessionStarted && currentAIndex >= totalAvailableMatches;
  const currentA = sessionStarted ? groupAOrder[currentAIndex] ?? "" : "";

  useEffect(() => {
    setLoaded(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      setGroupAInput(typeof saved.groupAInput === "string" ? saved.groupAInput : "");
      setGroupBInput(typeof saved.groupBInput === "string" ? saved.groupBInput : "");
      setShuffleGroupA(Boolean(saved.shuffleGroupA));
      setSessionStarted(Boolean(saved.sessionStarted));
      setGroupAOrder(Array.isArray(saved.groupAOrder) ? saved.groupAOrder : EMPTY_ARRAY);
      setCurrentAIndex(Number.isInteger(saved.currentAIndex) ? saved.currentAIndex : 0);
      setMatches(Array.isArray(saved.matches) ? saved.matches : EMPTY_ARRAY);
      setSelectedB(typeof saved.selectedB === "string" ? saved.selectedB : "");
      setSpinDisplay(typeof saved.spinDisplay === "string" ? saved.spinDisplay : "");
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const payload = {
      groupAInput,
      groupBInput,
      shuffleGroupA,
      sessionStarted,
      groupAOrder,
      currentAIndex,
      matches,
      selectedB,
      spinDisplay,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [
    loaded,
    groupAInput,
    groupBInput,
    shuffleGroupA,
    sessionStarted,
    groupAOrder,
    currentAIndex,
    matches,
    selectedB,
    spinDisplay,
  ]);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) {
        clearTimeout(spinTimerRef.current);
      }
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!sessionStarted) {
      setError("");
      setWarning("");
      return;
    }

    if (!parsedA.names.length || !parsedB.names.length) {
      setError("Both groups must contain at least one name.");
      return;
    }

    setError("");
    setWarning(validationMessage);
  }, [sessionStarted, validationMessage, parsedA.names.length, parsedB.names.length]);

  function clearTimers() {
    if (spinTimerRef.current) {
      clearTimeout(spinTimerRef.current);
      spinTimerRef.current = null;
    }
    if (spinIntervalRef.current) {
      clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = null;
    }
  }

  function resetAll() {
    clearTimers();
    localStorage.removeItem(STORAGE_KEY);
    setGroupAInput("");
    setGroupBInput("");
    setShuffleGroupA(false);
    setSessionStarted(false);
    setGroupAOrder(EMPTY_ARRAY);
    setCurrentAIndex(0);
    setMatches(EMPTY_ARRAY);
    setSelectedB("");
    setSpinDisplay("");
    setIsSpinning(false);
    setError("");
    setWarning("");
  }

  function startMatching() {
    const normalizedA = normalizeNames(groupAInput);
    const normalizedB = normalizeNames(groupBInput);

    if (!normalizedA.names.length || !normalizedB.names.length) {
      setError("Both groups must contain at least one name.");
      return;
    }

    const orderedA = shuffleGroupA ? shuffleArray(normalizedA.names) : normalizedA.names;

    setGroupAInput(normalizedA.names.join("\n"));
    setGroupBInput(normalizedB.names.join("\n"));
    setGroupAOrder(orderedA);
    setCurrentAIndex(0);
    setMatches(EMPTY_ARRAY);
    setSelectedB("");
    setSpinDisplay("");
    setSessionStarted(true);
    setError("");
    setWarning(buildValidationMessage(normalizedA, normalizedB));
  }

  function spinForMatch() {
    if (!sessionStarted || isSpinning || isComplete) return;
    if (!currentA || !remainingB.length) return;

    clearTimers();
    setIsSpinning(true);
    setSelectedB("");
    setSpinDisplay(remainingB[0]);

    const spinNames = [...remainingB];
    let index = 0;

    spinIntervalRef.current = setInterval(() => {
      index = (index + 1) % spinNames.length;
      const nextName = spinNames[index];
      setSpinDisplay(nextName);
    }, 90);

    spinTimerRef.current = setTimeout(() => {
      clearTimers();
      const finalName = spinNames[Math.floor(Math.random() * spinNames.length)];
      const nextMatch = {
        number: matches.length + 1,
        groupA: currentA,
        groupB: finalName,
      };
      setMatches((prev) => [...prev, nextMatch]);
      setSelectedB(finalName);
      setSpinDisplay(finalName);
      setCurrentAIndex((prev) => prev + 1);
      setIsSpinning(false);
    }, SPIN_DURATION_MS);
  }

  function undoLastMatch() {
    if (isSpinning || !matches.length) return;
    const lastMatch = matches[matches.length - 1];
    setMatches((prev) => prev.slice(0, -1));
    setCurrentAIndex((prev) => Math.max(0, prev - 1));
    setSelectedB(lastMatch.groupB);
    setSpinDisplay(lastMatch.groupB);
  }

  function exportCsv() {
    if (!matches.length) return;
    const csv = buildCsv(matches);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "random-pair-matches.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const canStart = !sessionStarted && parsedA.names.length > 0 && parsedB.names.length > 0;
  const canSpin = sessionStarted && !isSpinning && !isComplete && !!currentA && remainingB.length > 0;
  const canUndo = sessionStarted && !isSpinning && matches.length > 0;

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Temporary pair matcher</p>
          <h1>Random Pair Picker</h1>
          <p className="subcopy">
            Enter names, spin through Group B, and build one-time matches without a backend.
          </p>
        </div>

        <div className="status-row">
          <span className={`badge ${sessionStarted ? "badge-active" : "badge-idle"}`}>
            {sessionStarted ? "Matching in progress" : "Ready to start"}
          </span>
          <span className="badge badge-muted">{matches.length} matches</span>
          <span className="badge badge-muted">
            {totalAvailableMatches ? `${Math.min(currentAIndex, totalAvailableMatches)}/${totalAvailableMatches}` : "0/0"}
          </span>
        </div>
      </section>

      <section className="grid-layout">
        <div className="panel">
          <label htmlFor="groupA">Group A Names</label>
          <textarea
            id="groupA"
            value={groupAInput}
            onChange={(event) => setGroupAInput(event.target.value)}
            placeholder="One name per line"
            disabled={sessionStarted}
          />
        </div>

        <div className="panel">
          <label htmlFor="groupB">Group B Names</label>
          <textarea
            id="groupB"
            value={groupBInput}
            onChange={(event) => setGroupBInput(event.target.value)}
            placeholder="One name per line"
            disabled={sessionStarted}
          />
        </div>
      </section>

      <section className="controls-card">
        <div className="toggle-row">
          <label className="toggle">
            <input
              type="checkbox"
              checked={shuffleGroupA}
              onChange={(event) => setShuffleGroupA(event.target.checked)}
              disabled={sessionStarted}
            />
            <span>Shuffle Group A before matching</span>
          </label>
        </div>

        <div className="button-row">
          <button className="primary-button" onClick={startMatching} disabled={!canStart}>
            Start
          </button>
          <button className="secondary-button" onClick={spinForMatch} disabled={!canSpin}>
            {isSpinning ? "Spinning..." : "Spin"}
          </button>
          <button className="secondary-button" onClick={undoLastMatch} disabled={!canUndo}>
            Undo Last Match
          </button>
          <button className="secondary-button" onClick={exportCsv} disabled={!matches.length}>
            Export Matches as CSV
          </button>
          <button className="danger-button" onClick={resetAll}>
            Reset All
          </button>
        </div>

        <div className="message-stack">
          {error ? <div className="message error">{error}</div> : null}
          {warning ? <div className="message warning">{warning}</div> : null}
          {isComplete ? (
            <div className="message success">All possible matches completed.</div>
          ) : null}
          {!sessionStarted && validationMessage ? (
            <div className="message warning">{validationMessage}</div>
          ) : null}
        </div>
      </section>

      <section className="match-area">
        <div className="current-card">
          <div className="current-label">Current Group A person</div>
          <div className="current-value">{currentA || "Waiting to start"}</div>
        </div>

        <div className="wheel-card">
          <div className="current-label">Group B spin display</div>
          <div className={`wheel ${isSpinning ? "wheel-spinning" : ""}`}>{spinDisplay || "-"}</div>
          <div className="selected-block">
            <div className="selected-label">Selected Group B person</div>
            <div className="selected-value">{selectedB || "No selection yet"}</div>
          </div>
        </div>
      </section>

      <section className="history-card">
        <div className="section-header">
          <h2>Match History</h2>
          <p>{matches.length ? `${matches.length} pair${matches.length === 1 ? "" : "s"} recorded` : "No matches yet"}</p>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Group A</th>
                <th>Group B</th>
              </tr>
            </thead>
            <tbody>
              {matches.length ? (
                matches.map((match) => (
                  <tr key={`${match.number}-${match.groupA}-${match.groupB}`}>
                    <td>{match.number}</td>
                    <td>{match.groupA}</td>
                    <td>{match.groupB}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="empty-state">
                    Start matching to build the table.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
