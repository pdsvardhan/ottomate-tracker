import Database from "better-sqlite3";
import { mermaidToFlow } from "@/lib/diagrams/mermaid-to-flow";
const db = new Database("data/ottomate.db", { readonly: true });
const rows = db.prepare("SELECT project_slug, kind, id, mermaid_src FROM diagram_artifacts ORDER BY project_slug, kind").all() as any[];
let ok = 0, fb = 0;
for (const r of rows) {
  const g = mermaidToFlow(r.mermaid_src);
  if (g) { ok++; console.log(`OK   ${r.project_slug}/${r.kind}#${r.id}  nodes=${g.nodes.length} edges=${g.edges.length} dir=${g.direction}`); }
  else { fb++; const head = (r.mermaid_src as string).trim().split("\n")[0]; console.log(`FALL ${r.project_slug}/${r.kind}#${r.id}  (${head})`); }
}
console.log(`\nconverted ${ok}/${rows.length} · fallback ${fb}`);
