import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  Trash2,
  X,
  Code2,
  Download,
  Copy,
  Check,
  Boxes,
  GitBranch,
  RotateCcw,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Constants & seed data                                               */
/* ------------------------------------------------------------------ */

const BOX_WIDTH = 232;
const HEADER_H = 40;
const ROW_H = 20;
const SECTION_PAD = 10;
const CANVAS_W = 1800;
const CANVAS_H = 1300;

const VIS_SYMBOL = { public: "+", private: "-", protected: "#", package: "~" };
const VIS_OPTIONS = ["public", "private", "protected", "package"];

const REL_TYPES = [
  { key: "inheritance", label: "Inheritance", hint: "extends", dash: false, glyph: "\u25B7" },
  { key: "implementation", label: "Implementation", hint: "implements", dash: true, glyph: "\u25B7" },
  { key: "association", label: "Association", hint: "has-a", dash: false, glyph: "\u203A" },
  { key: "aggregation", label: "Aggregation", hint: "shared owns", dash: false, glyph: "\u25C7" },
  { key: "composition", label: "Composition", hint: "exclusive owns", dash: false, glyph: "\u25C6" },
  { key: "dependency", label: "Dependency", hint: "uses", dash: true, glyph: "\u203A" },
];

function relMeta(key) {
  return REL_TYPES.find((r) => r.key === key);
}

let uidCounter = 0;
function uid(prefix) {
  uidCounter += 1;
  return `${prefix}-${uidCounter}`;
}

function seedClasses() {
  return [
    {
      id: "c-animal",
      name: "Animal",
      type: "abstract",
      x: 60,
      y: 70,
      fields: [{ id: uid("f"), name: "name", type: "String", visibility: "protected" }],
      methods: [
        { id: uid("m"), name: "makeSound", returnType: "void", visibility: "public", params: "", abstract: true },
        { id: uid("m"), name: "getName", returnType: "String", visibility: "public", params: "", abstract: false },
      ],
    },
    {
      id: "c-dog",
      name: "Dog",
      type: "class",
      x: 470,
      y: 70,
      fields: [{ id: uid("f"), name: "breed", type: "String", visibility: "private" }],
      methods: [
        { id: uid("m"), name: "makeSound", returnType: "void", visibility: "public", params: "", abstract: false },
        { id: uid("m"), name: "fetch", returnType: "void", visibility: "public", params: "", abstract: false },
      ],
    },
    {
      id: "c-movable",
      name: "Movable",
      type: "interface",
      x: 60,
      y: 360,
      fields: [],
      methods: [{ id: uid("m"), name: "move", returnType: "void", visibility: "public", params: "int distance", abstract: true }],
    },
    {
      id: "c-owner",
      name: "Owner",
      type: "class",
      x: 470,
      y: 360,
      fields: [{ id: uid("f"), name: "name", type: "String", visibility: "private" }],
      methods: [{ id: uid("m"), name: "feed", returnType: "void", visibility: "public", params: "", abstract: false }],
    },
  ];
}

function seedRelationships() {
  return [
    { id: uid("r"), type: "inheritance", sourceId: "c-dog", targetId: "c-animal" },
    { id: uid("r"), type: "implementation", sourceId: "c-dog", targetId: "c-movable" },
    { id: uid("r"), type: "aggregation", sourceId: "c-owner", targetId: "c-dog" },
  ];
}

/* ------------------------------------------------------------------ */
/* Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

function calcDims(cls) {
  const fieldsH = cls.fields.length * ROW_H + (cls.fields.length ? SECTION_PAD : 6);
  const methodsH = cls.methods.length * ROW_H + (cls.methods.length ? SECTION_PAD : 6);
  const height = HEADER_H + fieldsH + methodsH + 2;
  return { width: BOX_WIDTH, height, fieldsH, methodsH };
}

function getEdgePoint(box, towardX, towardY) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const dx = towardX - cx;
  const dy = towardY - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const halfW = box.w / 2;
  const halfH = box.h / 2;
  const scaleX = dx !== 0 ? Math.abs(halfW / dx) : Infinity;
  const scaleY = dy !== 0 ? Math.abs(halfH / dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

/* ------------------------------------------------------------------ */
/* Java code generation                                                */
/* ------------------------------------------------------------------ */

function visKeyword(v) {
  return v === "package" ? "" : v + " ";
}

function capitalize(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function defaultReturnValue(type) {
  switch (type) {
    case "void":
      return null;
    case "int":
    case "short":
    case "byte":
    case "long":
      return "0";
    case "double":
      return "0.0";
    case "float":
      return "0.0f";
    case "boolean":
      return "false";
    case "char":
      return "'\\u0000'";
    default:
      return "null";
  }
}

function generateJavaForClass(cls, classes, relationships) {
  const findName = (id) => {
    const c = classes.find((c) => c.id === id);
    return c ? c.name : "Object";
  };

  const isInterface = cls.type === "interface";
  const isAbstract = cls.type === "abstract";

  const parentRels = relationships.filter((r) => r.type === "inheritance" && r.sourceId === cls.id);
  const implRels = relationships.filter((r) => r.type === "implementation" && r.sourceId === cls.id);
  const ownedRels = relationships.filter(
    (r) => ["composition", "aggregation", "association"].includes(r.type) && r.sourceId === cls.id
  );

  const lines = [];

  let extendsClause = "";
  if (isInterface) {
    if (parentRels.length) extendsClause = " extends " + parentRels.map((r) => findName(r.targetId)).join(", ");
  } else if (parentRels.length) {
    extendsClause = " extends " + findName(parentRels[0].targetId);
  }

  let implementsClause = "";
  if (!isInterface && implRels.length) {
    implementsClause = " implements " + implRels.map((r) => findName(r.targetId)).join(", ");
  }

  const keyword = isInterface ? "interface" : isAbstract ? "abstract class" : "class";
  lines.push(`public ${keyword} ${cls.name}${extendsClause}${implementsClause} {`);

  if (parentRels.length > 1 && !isInterface) {
    lines.push(
      `    // Note: Java allows a single superclass. Additional diagram parents ignored: ${parentRels
        .slice(1)
        .map((r) => findName(r.targetId))
        .join(", ")}`
    );
  }

  let allFields = [];
  if (!isInterface) {
    allFields = cls.fields.map((f) => ({ name: f.name, type: f.type, visibility: f.visibility, derived: false, composition: false }));
    ownedRels.forEach((r) => {
      const targetName = findName(r.targetId);
      const fieldName = targetName.charAt(0).toLowerCase() + targetName.slice(1);
      allFields.push({
        name: fieldName,
        type: targetName,
        visibility: "private",
        derived: true,
        composition: r.type === "composition",
      });
    });

    if (allFields.length) {
      lines.push("");
      allFields.forEach((f) => {
        lines.push(`    ${visKeyword(f.visibility)}${f.composition ? "final " : ""}${f.type} ${f.name};`);
      });
    }

    lines.push("");
    lines.push(`    public ${cls.name}() {`);
    lines.push(`    }`);

    if (allFields.length) {
      lines.push("");
      const params = allFields.map((f) => `${f.type} ${f.name}`).join(", ");
      lines.push(`    public ${cls.name}(${params}) {`);
      allFields.forEach((f) => lines.push(`        this.${f.name} = ${f.name};`));
      lines.push(`    }`);
    }

    allFields.forEach((f) => {
      const cap = capitalize(f.name);
      lines.push("");
      lines.push(`    public ${f.type} get${cap}() {`);
      lines.push(`        return ${f.name};`);
      lines.push(`    }`);
      if (!f.composition) {
        lines.push("");
        lines.push(`    public void set${cap}(${f.type} ${f.name}) {`);
        lines.push(`        this.${f.name} = ${f.name};`);
        lines.push(`    }`);
      }
    });
  } else if (cls.fields.length) {
    lines.push("");
    lines.push(`    // Note: fields on an interface are omitted (Java interfaces hold no instance state)`);
  }

  cls.methods.forEach((m) => {
    const abstractFlag = (isAbstract || isInterface) && m.abstract;
    const modifier = isInterface ? "" : visKeyword(m.visibility);
    const params = m.params || "";
    const sig = `${modifier}${abstractFlag && !isInterface ? "abstract " : ""}${m.returnType} ${m.name}(${params})`;
    lines.push("");
    if (isInterface || abstractFlag) {
      lines.push(`    ${sig};`);
    } else {
      lines.push(`    ${sig} {`);
      lines.push(`        // TODO: implement`);
      const def = defaultReturnValue(m.returnType);
      if (def !== null) lines.push(`        return ${def};`);
      lines.push(`    }`);
    }
  });

  lines.push("}");
  return lines.join("\n");
}

function generateAllJava(classes, relationships) {
  return classes.map((cls) => ({
    id: cls.id,
    name: cls.name,
    code: generateJavaForClass(cls, classes, relationships),
  }));
}

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

function MiniLine({ type }) {
  const meta = relMeta(type);
  return (
    <span className="mini-line" aria-hidden="true">
      <span className={`mini-line-stroke ${meta.dash ? "dashed" : ""}`} />
      <span className="mini-line-glyph">{meta.glyph}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function UMLClassDiagramGenerator() {
  const [classes, setClasses] = useState(seedClasses);
  const [relationships, setRelationships] = useState(seedRelationships);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedRelId, setSelectedRelId] = useState(null);
  const [connectType, setConnectType] = useState(null);
  const [connectSource, setConnectSource] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [showCode, setShowCode] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [copiedId, setCopiedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteClass, setConfirmDeleteClass] = useState(false);

  const canvasRef = useRef(null);

  const dims = useMemo(() => {
    const map = {};
    classes.forEach((c) => {
      map[c.id] = calcDims(c);
    });
    return map;
  }, [classes]);

  const selectedClass = classes.find((c) => c.id === selectedClassId) || null;
  const selectedRel = relationships.find((r) => r.id === selectedRelId) || null;

  /* ---------------- toast ---------------- */
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---------------- escape cancels connect mode ---------------- */
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        setConnectType(null);
        setConnectSource(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ---------------- dragging ---------------- */
  const toCanvasCoords = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  useEffect(() => {
    if (!dragState) return;
    function onMove(e) {
      const { x, y } = toCanvasCoords(e);
      setClasses((prev) =>
        prev.map((c) =>
          c.id === dragState.id
            ? { ...c, x: Math.max(0, Math.min(CANVAS_W - BOX_WIDTH, x - dragState.offsetX)), y: Math.max(0, y - dragState.offsetY) }
            : c
        )
      );
    }
    function onUp() {
      setDragState(null);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragState, toCanvasCoords]);

  function handleBoxMouseDown(e, cls) {
    if (connectType) return;
    e.stopPropagation();
    const { x, y } = toCanvasCoords(e);
    setDragState({ id: cls.id, offsetX: x - cls.x, offsetY: y - cls.y });
  }

  function handleBoxClick(e, cls) {
    e.stopPropagation();
    if (connectType) {
      handleConnectClick(cls.id);
      return;
    }
    setSelectedClassId(cls.id);
    setSelectedRelId(null);
    setConfirmDeleteClass(false);
  }

  function handleConnectClick(id) {
    if (!connectSource) {
      setConnectSource(id);
      return;
    }
    if (connectSource === id) {
      setConnectSource(null);
      return;
    }
    const rel = { id: uid("r"), type: connectType, sourceId: connectSource, targetId: id };
    setRelationships((prev) => [...prev, rel]);
    setConnectSource(null);
    setToast(`Added ${relMeta(connectType).label.toLowerCase()} relationship`);
  }

  function toggleConnectType(key) {
    setConnectSource(null);
    setConnectType((prev) => (prev === key ? null : key));
  }

  /* ---------------- CRUD: classes ---------------- */

  function addClass(type) {
    const countOfType = classes.filter((c) => c.type === type).length + 1;
    const label = type === "interface" ? "Interface" : type === "abstract" ? "AbstractClass" : "Class";
    const index = classes.length;
    const col = index % 3;
    const row = Math.floor(index / 3);
    const newClass = {
      id: uid("c"),
      name: `${label}${countOfType}`,
      type,
      x: 60 + col * 280,
      y: 70 + row * 260,
      fields: [],
      methods: [],
    };
    setClasses((prev) => [...prev, newClass]);
    setSelectedClassId(newClass.id);
    setSelectedRelId(null);
  }

  function updateClass(id, patch) {
    setClasses((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function deleteClass(id) {
    setClasses((prev) => prev.filter((c) => c.id !== id));
    setRelationships((prev) => prev.filter((r) => r.sourceId !== id && r.targetId !== id));
    if (selectedClassId === id) setSelectedClassId(null);
    setConfirmDeleteClass(false);
  }

  function addField(classId) {
    setClasses((prev) =>
      prev.map((c) =>
        c.id === classId
          ? { ...c, fields: [...c.fields, { id: uid("f"), name: "field", type: "String", visibility: "private" }] }
          : c
      )
    );
  }
  function updateField(classId, fieldId, patch) {
    setClasses((prev) =>
      prev.map((c) =>
        c.id === classId ? { ...c, fields: c.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)) } : c
      )
    );
  }
  function removeField(classId, fieldId) {
    setClasses((prev) => prev.map((c) => (c.id === classId ? { ...c, fields: c.fields.filter((f) => f.id !== fieldId) } : c)));
  }

  function addMethod(classId) {
    setClasses((prev) =>
      prev.map((c) =>
        c.id === classId
          ? {
              ...c,
              methods: [
                ...c.methods,
                { id: uid("m"), name: "method", returnType: "void", visibility: "public", params: "", abstract: false },
              ],
            }
          : c
      )
    );
  }
  function updateMethod(classId, methodId, patch) {
    setClasses((prev) =>
      prev.map((c) =>
        c.id === classId ? { ...c, methods: c.methods.map((m) => (m.id === methodId ? { ...m, ...patch } : m)) } : c
      )
    );
  }
  function removeMethod(classId, methodId) {
    setClasses((prev) => prev.map((c) => (c.id === classId ? { ...c, methods: c.methods.filter((m) => m.id !== methodId) } : c)));
  }

  function deleteRelationship(id) {
    setRelationships((prev) => prev.filter((r) => r.id !== id));
    setSelectedRelId(null);
  }

  function clearCanvas() {
    setClasses([]);
    setRelationships([]);
    setSelectedClassId(null);
    setSelectedRelId(null);
    setConfirmClear(false);
  }

  /* ---------------- code generation ---------------- */

  const generated = useMemo(() => generateAllJava(classes, relationships), [classes, relationships]);

  function openCode() {
    setActiveTab(0);
    setShowCode(true);
  }

  function copyCode(item) {
    navigator.clipboard
      .writeText(item.code)
      .then(() => {
        setCopiedId(item.id);
        setTimeout(() => setCopiedId(null), 1500);
      })
      .catch(() => setToast("Could not copy to clipboard"));
  }

  function downloadCode(item) {
    const blob = new Blob([item.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${item.name}.java`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadAll() {
    const combined = generated.map((g) => `// ===== ${g.name}.java =====\n\n${g.code}`).join("\n\n\n");
    const blob = new Blob([combined], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "uml-diagram-source.java.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /* ---------------- render helpers ---------------- */

  function renderRelationshipPath(rel) {
    const sourceCls = classes.find((c) => c.id === rel.sourceId);
    const targetCls = classes.find((c) => c.id === rel.targetId);
    if (!sourceCls || !targetCls) return null;
    const sd = dims[sourceCls.id];
    const td = dims[targetCls.id];
    if (!sd || !td) return null;

    const sourceBox = { x: sourceCls.x, y: sourceCls.y, w: sd.width, h: sd.height };
    const targetBox = { x: targetCls.x, y: targetCls.y, w: td.width, h: td.height };
    const targetCenter = { x: targetBox.x + targetBox.w / 2, y: targetBox.y + targetBox.h / 2 };
    const sourceCenter = { x: sourceBox.x + sourceBox.w / 2, y: sourceBox.y + sourceBox.h / 2 };

    const p1 = getEdgePoint(sourceBox, targetCenter.x, targetCenter.y);
    const p2 = getEdgePoint(targetBox, sourceCenter.x, sourceCenter.y);

    const meta = relMeta(rel.type);
    const markerEnd =
      rel.type === "inheritance" || rel.type === "implementation"
        ? "url(#uml-triangle)"
        : rel.type === "association" || rel.type === "dependency"
        ? "url(#uml-openarrow)"
        : undefined;
    const markerStart =
      rel.type === "aggregation" ? "url(#uml-diamond-hollow)" : rel.type === "composition" ? "url(#uml-diamond-filled)" : undefined;

    const isSelected = selectedRelId === rel.id;

    return (
      <g key={rel.id}>
        <line
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          className={`uml-rel-line ${isSelected ? "selected" : ""}`}
          strokeDasharray={meta.dash ? "7 5" : undefined}
          markerEnd={markerEnd}
          markerStart={markerStart}
        />
        <line
          x1={p1.x}
          y1={p1.y}
          x2={p2.x}
          y2={p2.y}
          className="uml-rel-hit"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedRelId(rel.id);
            setSelectedClassId(null);
          }}
        />
      </g>
    );
  }

  function renderClassBox(cls) {
    const d = dims[cls.id];
    const isSelected = selectedClassId === cls.id;
    const isConnectSource = connectSource === cls.id;
    const typeLabel = cls.type === "interface" ? "interface" : cls.type === "abstract" ? "abstract class" : "class";

    return (
      <div
        key={cls.id}
        className={`uml-box type-${cls.type} ${isSelected ? "selected" : ""} ${isConnectSource ? "connect-source" : ""} ${
          connectType ? "connect-armed" : ""
        }`}
        style={{ left: cls.x, top: cls.y, width: d.width, height: d.height }}
        onMouseDown={(e) => handleBoxMouseDown(e, cls)}
        onClick={(e) => handleBoxClick(e, cls)}
      >
        <div className="uml-box-header">
          <div className="uml-box-stereotype">{cls.type !== "class" ? `\u00AB${typeLabel}\u00BB` : ""}</div>
          <div className={`uml-box-name ${cls.type === "abstract" ? "italic" : ""}`}>{cls.name}</div>
        </div>
        <div className="uml-box-divider" />
        <div className="uml-box-section">
          {cls.fields.map((f) => (
            <div key={f.id} className="uml-box-row">
              <span className="uml-vis">{VIS_SYMBOL[f.visibility]}</span>
              <span className="uml-row-text">
                {f.name}: {f.type}
              </span>
            </div>
          ))}
        </div>
        <div className="uml-box-divider" />
        <div className="uml-box-section">
          {cls.methods.map((m) => (
            <div key={m.id} className="uml-box-row">
              <span className="uml-vis">{VIS_SYMBOL[m.visibility]}</span>
              <span className={`uml-row-text ${m.abstract ? "italic" : ""}`}>
                {m.name}({m.params}): {m.returnType}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="uml-app" onClick={() => {}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

        .uml-app {
          --ink: #232a3b;
          --ink-soft: #565f75;
          --paper: #f6f3ea;
          --paper-card: #fffdf7;
          --grid-dot: #ddd4bd;
          --line: #ddd4bd;
          --navy: #161a2c;
          --navy-2: #1f2440;
          --navy-3: #262c4d;
          --gold: #c9932f;
          --gold-soft: #e3c07f;
          --gold-bg: rgba(201,147,47,0.14);
          --slate: #4a5578;
          --amber: #a9782a;
          --violet: #6c5e9c;
          --danger: #a3492f;
          --danger-bg: rgba(163,73,47,0.12);
          position: relative;
          display: flex;
          height: 100vh;
          width: 100%;
          background: var(--paper);
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          overflow: hidden;
        }
        .uml-app * { box-sizing: border-box; }

        /* ---------------- sidebar ---------------- */
        .uml-sidebar {
          width: 250px;
          flex-shrink: 0;
          background: var(--navy);
          color: #e8e6db;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }
        .uml-brand {
          padding: 20px 20px 14px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .uml-brand-title {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: 17px;
          letter-spacing: 0.01em;
          color: #f4f1e6;
        }
        .uml-brand-sub {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: var(--gold-soft);
          margin-top: 4px;
        }
        .uml-side-section {
          padding: 16px 16px 6px 16px;
        }
        .uml-side-label {
          font-size: 11px;
          font-weight: 600;
          color: #9aa0b8;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 10px;
        }
        .uml-side-buttons {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .uml-side-btn {
          display: flex;
          align-items: center;
          gap: 9px;
          background: var(--navy-2);
          border: 1px solid rgba(255,255,255,0.06);
          color: #ece9dd;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          padding: 8px 10px;
          border-radius: 5px;
          cursor: pointer;
          text-align: left;
          transition: background 0.12s ease, border-color 0.12s ease;
        }
        .uml-side-btn:hover { background: var(--navy-3); }
        .uml-side-btn.active {
          background: var(--gold-bg);
          border-color: var(--gold);
          color: var(--gold-soft);
        }
        .uml-side-btn small {
          font-family: 'IBM Plex Mono', monospace;
          color: #8d93ab;
          font-size: 10.5px;
          margin-left: auto;
        }
        .uml-side-btn.active small { color: var(--gold-soft); }

        .mini-line {
          display: inline-flex;
          align-items: center;
          width: 26px;
          flex-shrink: 0;
        }
        .mini-line-stroke {
          width: 18px;
          height: 0;
          border-top: 2px solid #b7bcd0;
        }
        .mini-line-stroke.dashed { border-top-style: dashed; }
        .mini-line-glyph { color: #b7bcd0; font-size: 13px; margin-left: 1px; }
        .uml-side-btn.active .mini-line-stroke { border-color: var(--gold-soft); }
        .uml-side-btn.active .mini-line-glyph { color: var(--gold-soft); }

        .uml-side-footer {
          margin-top: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }
        .uml-btn-primary {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--gold);
          color: #21170a;
          font-weight: 600;
          font-size: 13.5px;
          border: none;
          border-radius: 5px;
          padding: 10px 12px;
          cursor: pointer;
          transition: background 0.12s ease;
        }
        .uml-btn-primary:hover { background: var(--gold-soft); }
        .uml-btn-ghost-dark {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          background: transparent;
          color: #b9bfd4;
          font-size: 12.5px;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 5px;
          padding: 8px 10px;
          cursor: pointer;
        }
        .uml-btn-ghost-dark:hover { border-color: rgba(255,255,255,0.3); color: #ece9dd; }
        .uml-btn-ghost-dark.danger-armed { border-color: var(--danger); color: #e2a690; }

        .connect-banner {
          position: absolute;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--navy);
          color: #f4f1e6;
          padding: 9px 10px 9px 16px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.25);
          z-index: 20;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .connect-banner b { color: var(--gold-soft); font-weight: 600; }
        .connect-banner button {
          background: rgba(255,255,255,0.08);
          border: none;
          color: #e8e6db;
          padding: 6px 10px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .connect-banner button:hover { background: rgba(255,255,255,0.16); }

        /* ---------------- canvas ---------------- */
        .uml-canvas-wrap {
          position: relative;
          flex: 1;
          overflow: auto;
        }
        .uml-canvas {
          position: relative;
          background-color: var(--paper);
          background-image: radial-gradient(circle, var(--grid-dot) 1px, transparent 1px);
          background-size: 22px 22px;
        }
        .uml-svg { position: absolute; top: 0; left: 0; pointer-events: none; }
        .uml-rel-line {
          stroke: var(--ink);
          stroke-width: 1.6;
          fill: none;
        }
        .uml-rel-line.selected { stroke: var(--gold); stroke-width: 2.2; }
        .uml-rel-hit {
          stroke: transparent;
          stroke-width: 14;
          fill: none;
          pointer-events: stroke;
          cursor: pointer;
        }

        .uml-box {
          position: absolute;
          background: var(--paper-card);
          border: 1px solid #d8cfb8;
          border-left: 4px solid var(--slate);
          border-radius: 4px;
          box-shadow: 0 1px 2px rgba(35,42,59,0.06), 0 4px 10px rgba(35,42,59,0.05);
          cursor: grab;
          user-select: none;
        }
        .uml-box:active { cursor: grabbing; }
        .uml-box.type-interface { border-left-color: var(--amber); }
        .uml-box.type-abstract { border-left-color: var(--violet); }
        .uml-box.selected { outline: 2px solid var(--gold); outline-offset: 1px; }
        .uml-box.connect-armed { cursor: crosshair; }
        .uml-box.connect-source { outline: 2px dashed var(--gold); outline-offset: 1px; }

        .uml-box-header {
          padding: 6px 12px 5px 12px;
          text-align: center;
        }
        .uml-box-stereotype {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10.5px;
          color: var(--ink-soft);
          letter-spacing: 0.02em;
        }
        .uml-box-name {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: 14.5px;
          color: var(--ink);
        }
        .uml-box-name.italic { font-style: italic; }
        .uml-box-divider { height: 1px; background: #e2dac2; }
        .uml-box-section { padding: 5px 10px; min-height: 6px; }
        .uml-box-row {
          display: flex;
          align-items: baseline;
          gap: 6px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11.5px;
          line-height: ${ROW_H}px;
          color: var(--ink);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .uml-vis { color: var(--gold); font-weight: 600; width: 10px; flex-shrink: 0; }
        .uml-row-text { overflow: hidden; text-overflow: ellipsis; }
        .uml-row-text.italic { font-style: italic; }

        .uml-legend {
          position: absolute;
          bottom: 16px;
          left: 16px;
          background: var(--paper-card);
          border: 1px solid #ddd4bd;
          border-radius: 6px;
          padding: 10px 14px;
          font-size: 11.5px;
          box-shadow: 0 2px 8px rgba(35,42,59,0.06);
          z-index: 5;
          display: grid;
          grid-template-columns: repeat(2, auto);
          gap: 5px 18px;
        }
        .uml-legend-item { display: flex; align-items: center; gap: 7px; color: var(--ink-soft); }
        .uml-legend-item .mini-line-stroke,
        .uml-legend-item .mini-line-glyph { filter: none; }
        .uml-legend-item .mini-line-stroke { border-top-color: var(--ink); }
        .uml-legend-item .mini-line-glyph { color: var(--ink); }

        /* ---------------- editor panel ---------------- */
        .uml-editor {
          width: 320px;
          flex-shrink: 0;
          background: var(--navy);
          color: #e8e6db;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .uml-editor-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .uml-editor-title { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 15px; }
        .uml-icon-btn {
          background: transparent;
          border: none;
          color: #9aa0b8;
          cursor: pointer;
          padding: 4px;
          display: flex;
        }
        .uml-icon-btn:hover { color: #ece9dd; }
        .uml-editor-body { padding: 16px 18px; display: flex; flex-direction: column; gap: 16px; }

        .uml-form-label {
          font-size: 11px;
          color: #9aa0b8;
          margin-bottom: 5px;
          display: block;
        }
        .uml-input, .uml-select {
          width: 100%;
          background: var(--navy-2);
          border: 1px solid rgba(255,255,255,0.1);
          color: #f0eee3;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          padding: 7px 8px;
          border-radius: 4px;
          outline: none;
        }
        .uml-input:focus, .uml-select:focus { border-color: var(--gold); }
        .uml-input.mono { font-family: 'IBM Plex Mono', monospace; }

        .uml-editor-section-title {
          font-size: 11.5px;
          font-weight: 600;
          color: #c7cbdb;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .uml-add-link {
          background: transparent;
          border: none;
          color: var(--gold-soft);
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .uml-add-link:hover { color: var(--gold); }

        .uml-member-row {
          background: var(--navy-2);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 5px;
          padding: 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 7px;
          align-items: center;
        }
        .uml-member-row select.uml-select { width: 74px; flex-shrink: 0; }
        .uml-member-row input.uml-input { flex: 1 1 70px; min-width: 60px; }
        .uml-member-row .col { width: 100%; display: flex; gap: 6px; align-items: center; }
        .uml-member-row .abstract-toggle {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: #b9bfd4;
          white-space: nowrap;
        }
        .uml-row-delete {
          background: transparent;
          border: none;
          color: #8d93ab;
          cursor: pointer;
          padding: 3px;
          flex-shrink: 0;
        }
        .uml-row-delete:hover { color: #e2a690; }

        .uml-editor-footer {
          margin-top: auto;
          padding: 16px 18px;
          border-top: 1px solid rgba(255,255,255,0.08);
          display: flex;
          gap: 8px;
        }
        .uml-btn-danger {
          flex: 1;
          background: var(--danger-bg);
          color: #e2a690;
          border: 1px solid rgba(163,73,47,0.4);
          border-radius: 5px;
          padding: 9px 10px;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }
        .uml-btn-danger:hover { background: rgba(163,73,47,0.25); }
        .uml-btn-danger.confirm { background: var(--danger); color: #fff2ec; }
        .uml-btn-cancel {
          background: transparent;
          border: 1px solid rgba(255,255,255,0.14);
          color: #b9bfd4;
          border-radius: 5px;
          padding: 9px 12px;
          font-size: 13px;
          cursor: pointer;
        }

        /* ---------------- code modal ---------------- */
        .uml-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(16,18,30,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
        }
        .uml-modal {
          width: min(880px, 92vw);
          height: min(640px, 86vh);
          background: #12151f;
          border-radius: 10px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.45);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .uml-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .uml-modal-title {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          color: #f0eee3;
          font-size: 15px;
          display: flex;
          align-items: center;
          gap: 9px;
        }
        .uml-modal-actions { display: flex; gap: 8px; }
        .uml-tabs {
          display: flex;
          gap: 4px;
          padding: 10px 14px 0 14px;
          overflow-x: auto;
          flex-shrink: 0;
        }
        .uml-tab {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          padding: 7px 12px;
          border-radius: 6px 6px 0 0;
          background: transparent;
          color: #8d93ab;
          border: none;
          cursor: pointer;
          white-space: nowrap;
        }
        .uml-tab.active { background: #1b1e2c; color: #e3c07f; }
        .uml-code-area {
          flex: 1;
          overflow: auto;
          background: #1b1e2c;
          padding: 18px 20px;
        }
        .uml-code-area pre {
          margin: 0;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12.5px;
          line-height: 1.65;
          color: #dfe2ef;
          white-space: pre;
        }
        .uml-code-toolbar {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 10px 20px;
          border-top: 1px solid rgba(255,255,255,0.06);
          background: #14172380;
        }
        .uml-btn-small {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.06);
          color: #e3e1d6;
          border: 1px solid rgba(255,255,255,0.1);
          font-size: 12px;
          padding: 7px 11px;
          border-radius: 5px;
          cursor: pointer;
        }
        .uml-btn-small:hover { background: rgba(255,255,255,0.12); }
        .uml-btn-small.gold { background: var(--gold); color: #21170a; border-color: var(--gold); font-weight: 600; }
        .uml-btn-small.gold:hover { background: var(--gold-soft); }

        .uml-toast {
          position: absolute;
          bottom: 20px;
          right: 20px;
          background: var(--navy);
          color: #f0eee3;
          padding: 10px 16px;
          border-radius: 6px;
          font-size: 13px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.3);
          z-index: 60;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .uml-empty-hint {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          color: var(--ink-soft);
          font-size: 13.5px;
          pointer-events: none;
        }
        .uml-empty-hint .big { font-family: 'Space Grotesk', sans-serif; font-size: 17px; color: var(--ink); margin-bottom: 6px; }
      `}</style>

      {/* -------------------- sidebar -------------------- */}
      <aside className="uml-sidebar">
        <div className="uml-brand">
          <div className="uml-brand-title">Class Board</div>
          <div className="uml-brand-sub">UML diagram &rarr; Java source</div>
        </div>

        <div className="uml-side-section">
          <div className="uml-side-label">
            <Boxes size={14} /> Add element
          </div>
          <div className="uml-side-buttons">
            <button className="uml-side-btn" onClick={() => addClass("class")}>
              <Plus size={14} /> Class
            </button>
            <button className="uml-side-btn" onClick={() => addClass("abstract")}>
              <Plus size={14} /> Abstract class
            </button>
            <button className="uml-side-btn" onClick={() => addClass("interface")}>
              <Plus size={14} /> Interface
            </button>
          </div>
        </div>

        <div className="uml-side-section">
          <div className="uml-side-label">
            <GitBranch size={14} /> Connect
          </div>
          <div className="uml-side-buttons">
            {REL_TYPES.map((r) => (
              <button
                key={r.key}
                className={`uml-side-btn ${connectType === r.key ? "active" : ""}`}
                onClick={() => toggleConnectType(r.key)}
                title={r.hint}
              >
                <MiniLine type={r.key} />
                {r.label}
                <small>{r.hint}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="uml-side-footer">
          <button className="uml-btn-primary" onClick={openCode} disabled={classes.length === 0}>
            <Code2 size={15} /> Generate Java code
          </button>
          {!confirmClear ? (
            <button className="uml-btn-ghost-dark" onClick={() => setConfirmClear(true)}>
              <RotateCcw size={13} /> Clear canvas
            </button>
          ) : (
            <button className="uml-btn-ghost-dark danger-armed" onClick={clearCanvas} onBlur={() => setConfirmClear(false)}>
              <Trash2 size={13} /> Confirm clear everything
            </button>
          )}
        </div>
      </aside>

      {/* -------------------- canvas -------------------- */}
      <main className="uml-canvas-wrap" onClick={() => { setSelectedClassId(null); setSelectedRelId(null); }}>
        {connectType && (
          <div className="connect-banner" onClick={(e) => e.stopPropagation()}>
            <span>
              {connectSource ? (
                <>
                  Pick the <b>target</b> class for {relMeta(connectType).label.toLowerCase()}
                </>
              ) : (
                <>
                  Pick the <b>source</b> class for {relMeta(connectType).label.toLowerCase()}
                </>
              )}
            </span>
            <button onClick={() => { setConnectType(null); setConnectSource(null); }}>
              <X size={13} /> Done
            </button>
          </div>
        )}

        <div className="uml-canvas" ref={canvasRef} style={{ width: CANVAS_W, height: CANVAS_H }}>
          <svg className="uml-svg" width={CANVAS_W} height={CANVAS_H}>
            <defs>
              <marker id="uml-triangle" markerWidth="16" markerHeight="14" refX="14" refY="7" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M0,0 L14,7 L0,14 Z" fill="#f6f3ea" stroke="#232a3b" strokeWidth="1.4" />
              </marker>
              <marker id="uml-openarrow" markerWidth="14" markerHeight="14" refX="12" refY="7" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M0,0 L12,7 L0,14" fill="none" stroke="#232a3b" strokeWidth="1.5" />
              </marker>
              <marker id="uml-diamond-hollow" markerWidth="22" markerHeight="14" refX="2" refY="7" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M2,7 L11,1.5 L20,7 L11,12.5 Z" fill="#f6f3ea" stroke="#232a3b" strokeWidth="1.4" />
              </marker>
              <marker id="uml-diamond-filled" markerWidth="22" markerHeight="14" refX="2" refY="7" orient="auto" markerUnits="userSpaceOnUse">
                <path d="M2,7 L11,1.5 L20,7 L11,12.5 Z" fill="#232a3b" stroke="#232a3b" strokeWidth="1.4" />
              </marker>
            </defs>
            {relationships.map(renderRelationshipPath)}
          </svg>

          {classes.map(renderClassBox)}

          {classes.length === 0 && (
            <div className="uml-empty-hint">
              <div className="big">Empty board</div>
              Add a class, abstract class or interface from the left to get started.
            </div>
          )}
        </div>

        <div className="uml-legend">
          {REL_TYPES.map((r) => (
            <div key={r.key} className="uml-legend-item">
              <MiniLine type={r.key} /> {r.label}
            </div>
          ))}
        </div>
      </main>

      {/* -------------------- editor: class -------------------- */}
      {selectedClass && (
        <aside className="uml-editor" onClick={(e) => e.stopPropagation()}>
          <div className="uml-editor-header">
            <div className="uml-editor-title">Edit class</div>
            <button className="uml-icon-btn" onClick={() => setSelectedClassId(null)}>
              <X size={17} />
            </button>
          </div>
          <div className="uml-editor-body">
            <div>
              <label className="uml-form-label">Name</label>
              <input
                className="uml-input mono"
                value={selectedClass.name}
                onChange={(e) => updateClass(selectedClass.id, { name: e.target.value.replace(/\s+/g, "") })}
              />
            </div>
            <div>
              <label className="uml-form-label">Kind</label>
              <select
                className="uml-select"
                value={selectedClass.type}
                onChange={(e) => updateClass(selectedClass.id, { type: e.target.value })}
              >
                <option value="class">Class</option>
                <option value="abstract">Abstract class</option>
                <option value="interface">Interface</option>
              </select>
            </div>

            <div>
              <div className="uml-editor-section-title">
                Fields
                <button className="uml-add-link" onClick={() => addField(selectedClass.id)}>
                  <Plus size={13} /> Add field
                </button>
              </div>
              {selectedClass.fields.length === 0 && <div className="uml-form-label">No fields yet.</div>}
              {selectedClass.fields.map((f) => (
                <div key={f.id} className="uml-member-row">
                  <select
                    className="uml-select"
                    value={f.visibility}
                    onChange={(e) => updateField(selectedClass.id, f.id, { visibility: e.target.value })}
                  >
                    {VIS_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {VIS_SYMBOL[v]} {v}
                      </option>
                    ))}
                  </select>
                  <input
                    className="uml-input mono"
                    placeholder="name"
                    value={f.name}
                    onChange={(e) => updateField(selectedClass.id, f.id, { name: e.target.value.replace(/\s+/g, "") })}
                  />
                  <input
                    className="uml-input mono"
                    placeholder="Type"
                    value={f.type}
                    onChange={(e) => updateField(selectedClass.id, f.id, { type: e.target.value.replace(/\s+/g, "") })}
                  />
                  <button className="uml-row-delete" onClick={() => removeField(selectedClass.id, f.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div>
              <div className="uml-editor-section-title">
                Methods
                <button className="uml-add-link" onClick={() => addMethod(selectedClass.id)}>
                  <Plus size={13} /> Add method
                </button>
              </div>
              {selectedClass.methods.length === 0 && <div className="uml-form-label">No methods yet.</div>}
              {selectedClass.methods.map((m) => (
                <div key={m.id} className="uml-member-row">
                  <div className="col">
                    <select
                      className="uml-select"
                      value={m.visibility}
                      onChange={(e) => updateMethod(selectedClass.id, m.id, { visibility: e.target.value })}
                      disabled={selectedClass.type === "interface"}
                    >
                      {VIS_OPTIONS.map((v) => (
                        <option key={v} value={v}>
                          {VIS_SYMBOL[v]} {v}
                        </option>
                      ))}
                    </select>
                    <input
                      className="uml-input mono"
                      placeholder="name"
                      value={m.name}
                      onChange={(e) => updateMethod(selectedClass.id, m.id, { name: e.target.value.replace(/\s+/g, "") })}
                    />
                    <button className="uml-row-delete" onClick={() => removeMethod(selectedClass.id, m.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="col">
                    <input
                      className="uml-input mono"
                      placeholder="params e.g. int x, String y"
                      value={m.params}
                      onChange={(e) => updateMethod(selectedClass.id, m.id, { params: e.target.value })}
                    />
                    <input
                      className="uml-input mono"
                      style={{ maxWidth: 96 }}
                      placeholder="Return"
                      value={m.returnType}
                      onChange={(e) => updateMethod(selectedClass.id, m.id, { returnType: e.target.value.replace(/\s+/g, "") })}
                    />
                  </div>
                  {selectedClass.type !== "interface" && (
                    <label className="abstract-toggle">
                      <input
                        type="checkbox"
                        checked={m.abstract}
                        onChange={(e) => updateMethod(selectedClass.id, m.id, { abstract: e.target.checked })}
                        disabled={selectedClass.type !== "abstract"}
                      />
                      abstract (no body)
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="uml-editor-footer">
            {!confirmDeleteClass ? (
              <button className="uml-btn-danger" onClick={() => setConfirmDeleteClass(true)}>
                <Trash2 size={14} /> Delete class
              </button>
            ) : (
              <>
                <button className="uml-btn-danger confirm" onClick={() => deleteClass(selectedClass.id)}>
                  <Trash2 size={14} /> Confirm delete
                </button>
                <button className="uml-btn-cancel" onClick={() => setConfirmDeleteClass(false)}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </aside>
      )}

      {/* -------------------- editor: relationship -------------------- */}
      {selectedRel && !selectedClass && (
        <aside className="uml-editor" onClick={(e) => e.stopPropagation()}>
          <div className="uml-editor-header">
            <div className="uml-editor-title">Edit relationship</div>
            <button className="uml-icon-btn" onClick={() => setSelectedRelId(null)}>
              <X size={17} />
            </button>
          </div>
          <div className="uml-editor-body">
            <div>
              <label className="uml-form-label">Type</label>
              <select
                className="uml-select"
                value={selectedRel.type}
                onChange={(e) => setRelationships((prev) => prev.map((r) => (r.id === selectedRel.id ? { ...r, type: e.target.value } : r)))}
              >
                {REL_TYPES.map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.label} ({r.hint})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="uml-form-label">From</label>
              <div className="uml-input mono" style={{ opacity: 0.85 }}>
                {classes.find((c) => c.id === selectedRel.sourceId)?.name || "?"}
              </div>
            </div>
            <div>
              <label className="uml-form-label">To</label>
              <div className="uml-input mono" style={{ opacity: 0.85 }}>
                {classes.find((c) => c.id === selectedRel.targetId)?.name || "?"}
              </div>
            </div>
          </div>
          <div className="uml-editor-footer">
            <button className="uml-btn-danger" onClick={() => deleteRelationship(selectedRel.id)}>
              <Trash2 size={14} /> Delete relationship
            </button>
          </div>
        </aside>
      )}

      {/* -------------------- code modal -------------------- */}
      {showCode && (
        <div className="uml-modal-overlay" onClick={() => setShowCode(false)}>
          <div className="uml-modal" onClick={(e) => e.stopPropagation()}>
            <div className="uml-modal-header">
              <div className="uml-modal-title">
                <Code2 size={16} /> Generated Java source
              </div>
              <div className="uml-modal-actions">
                <button className="uml-btn-small gold" onClick={downloadAll}>
                  <Download size={13} /> Download all
                </button>
                <button className="uml-icon-btn" onClick={() => setShowCode(false)}>
                  <X size={18} color="#c7cbdb" />
                </button>
              </div>
            </div>
            <div className="uml-tabs">
              {generated.map((g, i) => (
                <button key={g.id} className={`uml-tab ${activeTab === i ? "active" : ""}`} onClick={() => setActiveTab(i)}>
                  {g.name}.java
                </button>
              ))}
            </div>
            <div className="uml-code-area">
              <pre>{generated[activeTab]?.code}</pre>
            </div>
            {generated[activeTab] && (
              <div className="uml-code-toolbar">
                <button className="uml-btn-small" onClick={() => copyCode(generated[activeTab])}>
                  {copiedId === generated[activeTab].id ? <Check size={13} /> : <Copy size={13} />}
                  {copiedId === generated[activeTab].id ? "Copied" : "Copy"}
                </button>
                <button className="uml-btn-small" onClick={() => downloadCode(generated[activeTab])}>
                  <Download size={13} /> Download {generated[activeTab].name}.java
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <div className="uml-toast">{toast}</div>}
    </div>
  );
}
